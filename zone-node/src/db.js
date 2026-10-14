import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new Pool(config.db);

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

/**
 * Retries connecting to the database with exponential backoff on startup
 */
export async function initializeDatabaseWithRetry(maxAttempts = 15, delayMs = 2000) {
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
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn(`[DB] Database connection attempt ${attempt}/${maxAttempts} failed: ${err.message}. Retrying in ${delayMs}ms...`);
      if (attempt === maxAttempts) {
        throw new Error(`Failed to connect to database after ${maxAttempts} attempts: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Ensures the zone record exists in the zones table
 */
export async function ensureZoneExists(zoneId, zoneName) {
  const query = `
    INSERT INTO zones (zone_id, zone_name)
    VALUES ($1, $2)
    ON CONFLICT (zone_id) DO UPDATE SET zone_name = $2
  `;
  await pool.query(query, [zoneId, zoneName]);
}

/**
 * Counts incidents for a given zone
 */
export async function countIncidentsByZone(zoneId) {
  const res = await pool.query('SELECT COUNT(*) FROM incidents WHERE zone_id = $1', [zoneId]);
  return parseInt(res.rows[0].count, 10);
}

/**
 * Finds an incident by ID
 */
export async function findIncidentById(id) {
  const res = await pool.query('SELECT * FROM incidents WHERE id = $1', [id]);
  return res.rows[0] ? mapRowToIncident(res.rows[0]) : null;
}

/**
 * Lists incidents for a zone with optional severity and status filtering
 */
export async function listIncidents(zoneId, { severity, status } = {}) {
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
}

/**
 * Inserts a new incident record
 */
export async function insertIncident({ id, zoneId, type, severity, description, timestamp, status }) {
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
    timestamp || new Date().toISOString(),
    status ? status.toUpperCase() : 'ACTIVE',
  ]);
  return mapRowToIncident(res.rows[0]);
}

/**
 * Updates status of an existing incident
 */
export async function updateIncidentStatus(id, newStatus) {
  const query = `
    UPDATE incidents
    SET status = $1
    WHERE id = $2
    RETURNING *
  `;
  const res = await pool.query(query, [newStatus.toUpperCase(), id]);
  return res.rows[0] ? mapRowToIncident(res.rows[0]) : null;
}

function mapRowToIncident(row) {
  return {
    id: row.id,
    zoneId: row.zone_id,
    type: row.type,
    severity: row.severity,
    description: row.description,
    timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
    status: row.status,
  };
}
