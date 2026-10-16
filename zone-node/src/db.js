import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new Pool(config.db);

let isConnected = false;
const inMemoryZones = new Map();
const inMemoryIncidents = new Map();

pool.on('error', (err) => {
  console.warn('[DB] PostgreSQL pool error (falling back to memory):', err.message);
  isConnected = false;
});

/**
 * Checks if PostgreSQL is currently connected and active
 */
export function isPostgresConnected() {
  return isConnected;
}

/**
 * Tries connecting to PostgreSQL with retry; if unreachable, falls back to in-memory mode without crashing
 */
export async function initializeDatabaseWithRetry(maxAttempts = 3, delayMs = 1500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = await pool.connect();
      try {
        console.log(`[DB] Successfully connected to PostgreSQL (Attempt ${attempt}/${maxAttempts})`);
        
        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          await client.query(sql);
          console.log('[DB] Schema verified and applied successfully.');
        }
        isConnected = true;
        return true;
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn(`[DB] PostgreSQL connection attempt ${attempt}/${maxAttempts} notice: ${err.message}`);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // Graceful fallback to in-memory autonomous mode
  console.warn(
    `[DB] ⚠️ PostgreSQL is currently unreachable. Node [${config.zoneId}] is running in Autonomous In-Memory Mode. ` +
    `Hospital node remains 100% ONLINE. Retrying DB in background...`
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
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          await client.query(sql);
        }
        isConnected = true;
        console.log(`[DB] ✅ Background reconnect to PostgreSQL succeeded for zone [${config.zoneId}].`);
        clearInterval(reconnectTimer);
      } finally {
        client.release();
      }
    } catch {
      // Quietly wait for next retry
    }
  }, 10000);
  reconnectTimer.unref();

  return false;
}

/**
 * Ensures the zone record exists in the zones table
 */
export async function ensureZoneExists(zoneId, zoneName) {
  inMemoryZones.set(zoneId, { zone_id: zoneId, zone_name: zoneName });
  if (!isConnected) return;
  try {
    const query = `
      INSERT INTO zones (zone_id, zone_name)
      VALUES ($1, $2)
      ON CONFLICT (zone_id) DO UPDATE SET zone_name = $2
    `;
    await pool.query(query, [zoneId, zoneName]);
  } catch (err) {
    console.warn(`[DB] ensureZoneExists fallback: ${err.message}`);
  }
}

/**
 * Counts incidents for a given zone
 */
export async function countIncidentsByZone(zoneId) {
  if (isConnected) {
    try {
      const res = await pool.query('SELECT COUNT(*) FROM incidents WHERE zone_id = $1', [zoneId]);
      return parseInt(res.rows[0].count, 10);
    } catch (err) {
      console.warn(`[DB] countIncidentsByZone fallback: ${err.message}`);
    }
  }
  let count = 0;
  for (const inc of inMemoryIncidents.values()) {
    if (inc.zoneId === zoneId || inc.zone_id === zoneId) count++;
  }
  return count;
}

/**
 * Finds an incident by ID
 */
export async function findIncidentById(id) {
  if (isConnected) {
    try {
      const res = await pool.query('SELECT * FROM incidents WHERE id = $1', [id]);
      if (res.rows[0]) return mapRowToIncident(res.rows[0]);
    } catch (err) {
      console.warn(`[DB] findIncidentById fallback: ${err.message}`);
    }
  }
  const mem = inMemoryIncidents.get(id);
  return mem ? mapRowToIncident(mem) : null;
}

/**
 * Lists incidents for a zone with optional severity and status filtering
 */
export async function listIncidents(zoneId, { severity, status } = {}) {
  if (isConnected) {
    try {
      let query = 'SELECT * FROM incidents WHERE zone_id = $1';
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
      console.warn(`[DB] listIncidents fallback: ${err.message}`);
    }
  }

  // In-memory filter
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

/**
 * Inserts a new incident record
 */
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

  if (isConnected) {
    try {
      const query = `
        INSERT INTO incidents (id, zone_id, type, severity, description, timestamp, status)
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
      console.warn(`[DB] insertIncident fallback: ${err.message}`);
    }
  }

  return mapRowToIncident(incidentObj);
}

/**
 * Updates status of an existing incident
 */
export async function updateIncidentStatus(id, newStatus) {
  const mem = inMemoryIncidents.get(id);
  if (mem) {
    mem.status = newStatus.toUpperCase();
  }

  if (isConnected) {
    try {
      const query = `
        UPDATE incidents
        SET status = $1
        WHERE id = $2
        RETURNING *
      `;
      const res = await pool.query(query, [newStatus.toUpperCase(), id]);
      if (res.rows[0]) return mapRowToIncident(res.rows[0]);
    } catch (err) {
      console.warn(`[DB] updateIncidentStatus fallback: ${err.message}`);
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
