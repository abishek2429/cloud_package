import crypto from 'crypto';
import { config } from './config.js';
import * as db from './db.js';

let incidentSeq = 100;

export async function initializeZone() {
  const { zoneId, zoneName } = config;

  // 1. Ensure zone identity exists
  await db.ensureZoneExists(zoneId, zoneName);

  // 2. Check for existing persisted data (Durable Recovery Check)
  const existingCount = await db.countIncidentsByZone(zoneId);
  if (existingCount > 0) {
    console.log(
      `[Zone: ${zoneId}] DURABLE RECOVERY: Found ${existingCount} existing persisted incidents for zone [${zoneId}] in PostgreSQL. Preserving data and skipping demo seeding.`
    );
    return;
  }

  // 3. First-time initialization: seed baseline incidents
  console.log(`[Zone: ${zoneId}] First-time initialization: Seeding demo incidents for zone [${zoneId}] into PostgreSQL...`);

  if (zoneId === 'NORTH') {
    await createIncident({
      zoneId,
      type: 'ACCIDENT',
      severity: 'HIGH',
      description: 'Multi-vehicle collision on North Expressway near Mile 14',
      status: 'ACTIVE',
    });
    await createIncident({
      zoneId,
      type: 'TRAFFIC_JAM',
      severity: 'MEDIUM',
      description: 'Heavy peak-hour congestion around North Metro interchange',
      status: 'INVESTIGATING',
    });
  } else if (zoneId === 'CENTRAL') {
    await createIncident({
      zoneId,
      type: 'ROAD_CLOSED',
      severity: 'HIGH',
      description: 'Main Central Boulevard closed for emergency water main repair',
      status: 'ACTIVE',
    });
    await createIncident({
      zoneId,
      type: 'TRAFFIC_JAM',
      severity: 'LOW',
      description: 'Slow-moving traffic near Central Plaza shopping district',
      status: 'ACTIVE',
    });
  } else if (zoneId === 'SOUTH') {
    await createIncident({
      zoneId,
      type: 'TRAFFIC_JAM',
      severity: 'MEDIUM',
      description: 'Southbound bridge bottleneck due to maintenance lane closure',
      status: 'ACTIVE',
    });
  }

  const finalCount = await db.countIncidentsByZone(zoneId);
  console.log(`[Zone: ${zoneId}] Initialized ${zoneName} with ${finalCount} seeded demo incidents`);
}

/**
 * Creates a new incident or returns existing if duplicate ID provided (Idempotent).
 */
export async function createIncident(data) {
  const { zoneId } = config;

  // 1. Determine unique incident ID (use client/coordinator supplied idempotency ID, or generate new)
  let uniqueId = data.id && data.id.trim() ? data.id.trim() : null;

  if (uniqueId) {
    // Check if incident with this ID already exists
    const existing = await db.findIncidentById(uniqueId);
    if (existing) {
      console.log(`[Zone: ${zoneId}] DUPLICATE DETECTED: Incident [${uniqueId}] already exists. Returning existing entity (Idempotent).`);
      return { incident: existing, isDuplicate: true };
    }
  } else {
    incidentSeq++;
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    uniqueId = `INC-${zoneId}-${incidentSeq}-${randomHex}`;
  }

  // 2. Insert into PostgreSQL
  const incident = await db.insertIncident({
    id: uniqueId,
    zoneId: config.zoneId,
    type: data.type,
    severity: data.severity,
    description: data.description,
    timestamp: data.timestamp || new Date().toISOString(),
    status: data.status || 'ACTIVE',
  });

  console.log(`[Zone: ${zoneId}] Created incident [${uniqueId}]: ${incident.type} (${incident.severity}) - "${incident.description}"`);
  return { incident, isDuplicate: false };
}

export async function getIncidents(filters) {
  return await db.listIncidents(config.zoneId, filters);
}

export async function getIncidentById(id) {
  return await db.findIncidentById(id);
}

export async function updateStatus(id, newStatus) {
  return await db.updateIncidentStatus(id, newStatus);
}

export async function getIncidentCount() {
  return await db.countIncidentsByZone(config.zoneId);
}
