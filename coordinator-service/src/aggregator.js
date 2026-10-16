import crypto from 'crypto';
import { config } from './config.js';
import { executeWithRetry } from './retryExecutor.js';
import { healthMonitor } from './healthMonitor.js';

/**
 * Aggregates incident reports from all available zone nodes with graceful degradation.
 * Scatter-gather fan-out via Promise.allSettled() prevents cumulative network latency.
 */
export async function aggregateCityReport() {
  const startTime = Date.now();
  const configuredZones = config.zones;

  // Scatter queries to all zone partitions concurrently
  const queryPromises = configuredZones.map((zone) => querySingleZone(zone));
  const results = await Promise.allSettled(queryPromises);

  const allIncidents = [];
  const respondingZones = [];
  const unavailableZones = [];
  const nodeErrors = {};
  const nodeStatuses = [];

  results.forEach((outcome, idx) => {
    const zone = configuredZones[idx];
    const zoneBeds = zone.totalIcuBeds || 45;
    if (outcome.status === 'fulfilled' && outcome.value.success) {
      const data = outcome.value;
      respondingZones.push(zone.id);
      const incCount = Array.isArray(data.incidents) ? data.incidents.length : 0;
      const activeIncCount = Array.isArray(data.incidents) ? data.incidents.filter((i) => i.status !== 'RESOLVED').length : 0;
      if (Array.isArray(data.incidents)) {
        allIncidents.push(...data.incidents);
      }
      nodeStatuses.push({
        zoneId: zone.id,
        zoneName: zone.name,
        hospitalName: zone.hospitalName || zone.name,
        facilityType: zone.facilityType || 'Emergency Trauma Center',
        totalIcuBeds: zoneBeds,
        availableIcuBeds: Math.max(0, zoneBeds - activeIncCount),
        oxygenLevelPct: 98,
        url: zone.url,
        status: 'ONLINE',
        responseTimeMs: data.responseTimeMs,
        incidentCount: incCount,
        errorMessage: null,
      });
    } else {
      const errorMsg = outcome.status === 'fulfilled' ? outcome.value.errorMessage : outcome.reason?.message || 'Connection failure';
      unavailableZones.push(zone.id);
      nodeErrors[zone.id] = errorMsg;
      nodeStatuses.push({
        zoneId: zone.id,
        zoneName: zone.name,
        hospitalName: zone.hospitalName || zone.name,
        facilityType: zone.facilityType || 'Emergency Trauma Center',
        totalIcuBeds: zoneBeds,
        availableIcuBeds: 0,
        oxygenLevelPct: 0,
        url: zone.url,
        status: 'OFFLINE',
        responseTimeMs: outcome.status === 'fulfilled' ? outcome.value.responseTimeMs : 0,
        incidentCount: 0,
        errorMessage: errorMsg,
      });
      console.warn(`[Aggregator] Degraded aggregation: Hospital [${zone.id}] is unavailable (Reason: ${errorMsg})`);
    }
  });

  // Sort all incidents descending by timestamp
  allIncidents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Determine distributed system health status
  let systemStatus = 'HEALTHY';
  if (unavailableZones.length === configuredZones.length) {
    systemStatus = 'CRITICAL';
  } else if (unavailableZones.length > 0) {
    systemStatus = 'PARTIALLY_DEGRADED';
  }

  const activeCount = allIncidents.filter((i) => i.status === 'ACTIVE').length;
  const investigatingCount = allIncidents.filter((i) => i.status === 'INVESTIGATING').length;
  const resolvedCount = allIncidents.filter((i) => i.status === 'RESOLVED').length;
  const totalBeds = nodeStatuses.reduce((acc, curr) => acc + (curr.totalIcuBeds || 0), 0);
  const availableBeds = nodeStatuses.reduce((acc, curr) => acc + (curr.status === 'ONLINE' ? (curr.availableIcuBeds || 0) : 0), 0);

  const report = {
    totalIncidents: allIncidents.length,
    activeIncidents: activeCount,
    investigatingIncidents: investigatingCount,
    resolvedIncidents: resolvedCount,
    highSeverityCount: allIncidents.filter((i) => i.severity === 'HIGH').length,
    mediumSeverityCount: allIncidents.filter((i) => i.severity === 'MEDIUM').length,
    lowSeverityCount: allIncidents.filter((i) => i.severity === 'LOW').length,
    totalConfiguredZones: configuredZones.length,
    totalIcuBeds: totalBeds,
    availableIcuBeds: availableBeds,
    respondingZones,
    unavailableZones,
    systemStatus,
    generatedAt: new Date().toISOString(),
    incidents: allIncidents,
    emergencies: allIncidents,
    nodeStatuses,
    hospitalStatuses: nodeStatuses,
    nodeErrors,
  };

  const duration = Date.now() - startTime;
  console.log(
    `[Aggregator] Aggregated city report completed in ${duration}ms: ${allIncidents.length} incidents from ${respondingZones.length}/${configuredZones.length} zones responding. System status: ${systemStatus}`
  );

  return report;
}

async function querySingleZone(zone) {
  const start = Date.now();
  try {
    const response = await fetch(`${zone.url}/api/incidents`, {
      signal: AbortSignal.timeout(config.http.readTimeoutMs),
    });
    const latency = Date.now() - start;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const incidents = await response.json();
    return {
      success: true,
      zoneId: zone.id,
      zoneName: zone.name,
      responseTimeMs: latency,
      incidents,
    };
  } catch (err) {
    const latency = Date.now() - start;
    return {
      success: false,
      zoneId: zone.id,
      zoneName: zone.name,
      responseTimeMs: latency,
      errorMessage: err.message,
    };
  }
}

/**
 * Routes incident creation to designated zone with bounded retries and idempotency key assignment
 */
export async function routeIncidentCreation(requestData) {
  const targetZone = findZone(requestData.zoneId);

  // Assign deterministic unique incident ID (idempotency key) prior to network dispatch
  // so that bounded retries send the identical ID, avoiding duplicates.
  let incidentId = requestData.id && requestData.id.trim() ? requestData.id.trim() : null;
  if (!incidentId) {
    const timeSeq = Date.now() % 1000000;
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    incidentId = `INC-${targetZone.id.toUpperCase()}-${timeSeq}-${randomHex}`;
  }

  const payload = {
    ...requestData,
    id: incidentId,
    zoneId: targetZone.id.toUpperCase(),
  };

  return await executeWithRetry(`routeIncidentCreation-${targetZone.id}`, async () => {
    const response = await fetch(`${targetZone.url}/api/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.http.readTimeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`Zone ${targetZone.id} returned HTTP ${response.status}: ${errorText}`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    return {
      statusCode: response.status,
      data,
    };
  });
}

/**
 * Fetches incidents from a specific zone
 */
export async function getIncidentsForZone(zoneId) {
  const targetZone = findZone(zoneId);
  const response = await fetch(`${targetZone.url}/api/incidents`, {
    signal: AbortSignal.timeout(config.http.readTimeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch incidents from zone '${targetZone.id}': HTTP ${response.status}`);
  }
  return await response.json();
}

/**
 * Fetches health for a specific zone
 */
export async function getHealthForZone(zoneId) {
  const targetZone = findZone(zoneId);
  const response = await fetch(`${targetZone.url}/api/health`, {
    signal: AbortSignal.timeout(config.http.connectTimeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch health from zone '${targetZone.id}': HTTP ${response.status}`);
  }
  return await response.json();
}

export function findZone(zoneId) {
  if (!zoneId || !zoneId.trim()) {
    throw new Error('A valid target zoneId is required (e.g., NORTH, CENTRAL, SOUTH)');
  }
  const normalized = zoneId.trim().toUpperCase();
  const found = config.zones.find((z) => z.id.toUpperCase() === normalized);
  if (!found) {
    throw new Error(`Unknown target zone '${normalized}'. Configured zones: ${config.zones.map((z) => z.id).join(', ')}`);
  }
  return found;
}
