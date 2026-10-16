import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new Pool(config.db);

const zoneKey = (config.zoneId || 'NORTH').toLowerCase();
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch {}
}
const localDbFile = path.join(dataDir, `hospital_${zoneKey}_db.json`);

let isConnected = false;
const inMemoryZones = new Map();
const inMemoryIncidents = new Map();

// Load local persistent ledger if present
try {
  if (fs.existsSync(localDbFile)) {
    const raw = fs.readFileSync(localDbFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((inc) => inMemoryIncidents.set(inc.id, inc));
      console.log(`[DB:${config.zoneId}] Loaded ${inMemoryIncidents.size} incidents from dedicated file: hospital_${zoneKey}_db.json`);
    }
  }
} catch (e) {
  console.warn(`[DB:${config.zoneId}] Local DB load warning: ${e.message}`);
}

function persistToDisk() {
  try {
    const arr = Array.from(inMemoryIncidents.values());
    fs.writeFileSync(localDbFile, JSON.stringify(arr, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[DB:${config.zoneId}] Local disk write failed: ${err.message}`);
  }
}

pool.on('error', (err) => {
  console.warn(`[DB:${config.zoneId}] PostgreSQL pool notice (falling back to isolated memory):`, err.message);
  isConnected = false;
});

export function isPostgresConnected() {
  return isConnected;
}

export function getDatabaseMetadata() {
  return {
    databaseName: `pulsegrid_${zoneKey}`,
    storageEngine: isConnected ? 'PostgreSQL 15 (Isolated Schema)' : 'Autonomous Local JSON Ledger',
    dbFile: `data/hospital_${zoneKey}_db.json`,
    isolationModel: 'Shared-Nothing (Database-per-Service)',
    connected: isConnected,
  };
}

/**
 * Initializes database with isolated schema per hospital partition
 */
export async function initializeDatabaseWithRetry(maxAttempts = 3, delayMs = 1500) {
  const schemaName = `pulsegrid_${zoneKey}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = await pool.connect();
      try {
        console.log(`[DB:${config.zoneId}] Successfully connected to PostgreSQL (Attempt ${attempt}/${maxAttempts})`);

        // Create isolated physical schema for this hospital partition
        await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
        await client.query(`SET search_path TO ${schemaName}, public;`);

        // Read and execute schema inside isolated partition
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          await client.query(sql);
          console.log(`[DB:${config.zoneId}] Isolated schema [${schemaName}] verified & applied successfully.`);
        }
        isConnected = true;
        return true;
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn(`[DB:${config.zoneId}] PostgreSQL attempt ${attempt}/${maxAttempts} notice: ${err.message}`);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // Graceful fallback to dedicated in-memory & file storage
  console.warn(
    `[DB:${config.zoneId}] ⚠️ PostgreSQL unavailable. Node [${config.zoneId}] is running in Autonomous Shared-Nothing Mode ` +
    `(Storage: ${localDbFile}). Hospital node remains 100% ONLINE.`
  );
  isConnected = false;

  // Background reconnect loop
  const reconnectTimer = setInterval(async () => {
    if (isConnected) {
      clearInterval(reconnectTimer);
      return;
    }
    try {
      const client = await pool.connect();
      try {
        await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
        await client.query(`SET search_path TO ${schemaName}, public;`);
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          await client.query(sql);
        }
        isConnected = true;
        console.log(`[DB:${config.zoneId}] ✅ Reconnected to PostgreSQL isolated schema [${schemaName}].`);
        clearInterval(reconnectTimer);
      } finally {
        client.release();
      }
    } catch {}
  }, 10000);
  reconnectTimer.unref();

  return false;
}

export async function ensureZoneExists(zoneId, zoneName) {
  inMemoryZones.set(zoneId, { zone_id: zoneId, zone_name: zoneName });
  if (!isConnected) return;
  try {
    const schemaName = `pulsegrid_${zoneKey}`;
    const query = `
      INSERT INTO ${schemaName}.zones (zone_id, zone_name)
      VALUES ($1, $2)
      ON CONFLICT (zone_id) DO UPDATE SET zone_name = $2
    `;
    await pool.query(query, [zoneId, zoneName]);
  } catch (err) {
    console.warn(`[DB:${config.zoneId}] ensureZoneExists fallback: ${err.message}`);
  }
}

export async function countIncidentsByZone(zoneId) {
  if (isConnected) {
    try {
      const schemaName = `pulsegrid_${zoneKey}`;
      const res = await pool.query(`SELECT COUNT(*) FROM ${schemaName}.incidents WHERE zone_id = $1`, [zoneId]);
      return parseInt(res.rows[0].count, 10);
    } catch (err) {
      console.warn(`[DB:${config.zoneId}] countIncidentsByZone fallback: ${err.message}`);
    }
  }
  let count = 0;
  for (const inc of inMemoryIncidents.values()) {
    if (inc.zoneId === zoneId || inc.zone_id === zoneId) count++;
  }
  return count;
}

export async function findIncidentById(id) {
  if (isConnected) {
    try {
      const schemaName = `pulsegrid_${zoneKey}`;
      const res = await pool.query(`SELECT * FROM ${schemaName}.incidents WHERE id = $1`, [id]);
      if (res.rows[0]) return mapRowToIncident(res.rows[0]);
    } catch (err) {
      console.warn(`[DB:${config.zoneId}] findIncidentById fallback: ${err.message}`);
    }
  }
  const mem = inMemoryIncidents.get(id);
  return mem ? mapRowToIncident(mem) : null;
}

export async function listIncidents(zoneId, { severity, status } = {}) {
  if (isConnected) {
    try {
      const schemaName = `pulsegrid_${zoneKey}`;
      let query = `SELECT * FROM ${schemaName}.incidents WHERE zone_id = $1`;
      const params = [zoneId];
      let paramIdx = 2;

      if (severity) {
        query += ` AND severity = $${paramIdx++}`;
        params.push(severity.toUpperCase());
      }

      if (status) {
        query += ` AND status = $${paramIdx++}`;
        params.push(status.toUpperCase());
      }

      query += ' ORDER BY timestamp DESC';
      const res = await pool.query(query, params);
      return res.rows.map(mapRowToIncident);
    } catch (err) {
      console.warn(`[DB:${config.zoneId}] listIncidents fallback: ${err.message}`);
    }
  }

  let results = [];
  for (const inc of inMemoryIncidents.values()) {
    const incZone = inc.zoneId || inc.zone_id;
    if (incZone === zoneId) {
      if (severity && inc.severity?.toUpperCase() !== severity.toUpperCase()) continue;
      if (status && inc.status?.toUpperCase() !== status.toUpperCase()) continue;
      results.push(mapRowToIncident(inc));
    }
  }
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return results;
}

export async function insertIncident({ id, zoneId, type, severity, description, timestamp, status }) {
  const incidentObj = {
    id,
    zone_id: zoneId,
    zoneId,
    type: type.toUpperCase(),
    severity: severity.toUpperCase(),
    description,
    timestamp: timestamp || new Date().toISOString(),
    status: status ? status.toUpperCase() : 'ACTIVE',
  };

  inMemoryIncidents.set(id, incidentObj);
  persistToDisk();

  if (isConnected) {
    try {
      const schemaName = `pulsegrid_${zoneKey}`;
      const query = `
        INSERT INTO ${schemaName}.incidents (id, zone_id, type, severity, description, timestamp, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const res = await pool.query(query, [
        id,
        zoneId,
        type.toUpperCase(),
        severity.toUpperCase(),
        description,
        incidentObj.timestamp,
        incidentObj.status,
      ]);
      return mapRowToIncident(res.rows[0]);
    } catch (err) {
      console.warn(`[DB:${config.zoneId}] insertIncident fallback: ${err.message}`);
    }
  }

  return mapRowToIncident(incidentObj);
}

export async function updateIncidentStatus(id, newStatus) {
  const mem = inMemoryIncidents.get(id);
  if (mem) {
    mem.status = newStatus.toUpperCase();
    persistToDisk();
  }

  if (isConnected) {
    try {
      const schemaName = `pulsegrid_${zoneKey}`;
      const query = `
        UPDATE ${schemaName}.incidents
        SET status = $1
        WHERE id = $2
        RETURNING *
      `;
      const res = await pool.query(query, [newStatus.toUpperCase(), id]);
      if (res.rows[0]) return mapRowToIncident(res.rows[0]);
    } catch (err) {
      console.warn(`[DB:${config.zoneId}] updateIncidentStatus fallback: ${err.message}`);
    }
  }

  return mem ? mapRowToIncident(mem) : null;
}

function mapRowToIncident(row) {
  return {
    id: row.id,
    zoneId: row.zone_id || row.zoneId,
    type: row.type,
    severity: row.severity,
    description: row.description,
    timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : (row.timestamp || new Date().toISOString()),
    status: row.status,
  };
}
