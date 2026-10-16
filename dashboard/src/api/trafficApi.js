/**
 * Distributed Traffic Incident Monitoring System - API Service Layer
 *
 * Communicates directly with the central coordinator-service REST API.
 * Uses real endpoints and schemas verified from the Spring Boot backend.
 */

// Default to Vite proxy (/api) if VITE_API_BASE_URL is not set
const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

let currentBaseUrl = localStorage.getItem('traffic_api_base_url') || DEFAULT_BASE_URL;
let activityListeners = [];

export function getApiBaseUrl() {
  return currentBaseUrl;
}

export function setApiBaseUrl(newUrl) {
  currentBaseUrl = newUrl.replace(/\/+$/, '');
  localStorage.setItem('traffic_api_base_url', currentBaseUrl);
  notifyActivity({
    type: 'SIMULATION_EVENT',
    method: 'CONFIG',
    endpoint: 'API Base URL changed',
    status: 200,
    durationMs: 0,
    details: `API Target updated to: ${currentBaseUrl}`,
    timestamp: new Date().toISOString()
  });
}

export function subscribeActivity(callback) {
  activityListeners.push(callback);
  return () => {
    activityListeners = activityListeners.filter(cb => cb !== callback);
  };
}

function notifyActivity(entry) {
  activityListeners.forEach(cb => {
    try {
      cb(entry);
    } catch (err) {
      console.error('Error notifying activity listener', err);
    }
  });
}

/**
 * Universal HTTP fetch wrapper with latency timing and real telemetry logging.
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${currentBaseUrl}${endpoint}`;
  const method = options.method || 'GET';
  const startTime = performance.now();
  const timestamp = new Date().toISOString();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const durationMs = Math.round(performance.now() - startTime);
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { raw: text } : {};
    }

    notifyActivity({
      type: 'REAL_HTTP_TELEMETRY',
      method,
      endpoint,
      status: response.status,
      ok: response.ok,
      durationMs,
      details: data,
      timestamp
    });

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `HTTP ${response.status} ${response.statusText}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.response = data;
      throw err;
    }

    return data;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    notifyActivity({
      type: 'REAL_HTTP_TELEMETRY',
      method,
      endpoint,
      status: error.status || 0,
      ok: false,
      durationMs,
      details: error.message || 'Network connection failed / Connection refused',
      timestamp
    });
    throw error;
  }
}

/**
 * 1. Fetch Aggregated City-Wide Incident Report
 * GET /coordinator/city-report
 */
export async function getCityReport() {
  return await apiRequest('/coordinator/city-report');
}

/**
 * 2. Fetch Diagnostic Status of All Zone Nodes
 * GET /coordinator/nodes
 */
export async function getNodeStatuses() {
  return await apiRequest('/coordinator/nodes');
}

/**
 * 3. Fetch Coordinator Service Health
 * GET /coordinator/health
 */
export async function getCoordinatorHealth() {
  return await apiRequest('/coordinator/health');
}

/**
 * 4. Submit New Incident via Coordinator
 * POST /coordinator/incidents
 */
export async function submitIncident(incidentData) {
  return await apiRequest('/coordinator/incidents', {
    method: 'POST',
    body: JSON.stringify(incidentData)
  });
}

/**
 * 5. Update Incident Status in a Specific Zone Node
 * Routed seamlessly through the central coordinator proxy for cloud & local compatibility.
 * PATCH /api/incidents/{id}/status
 */
export async function updateIncidentStatus(zoneId, incidentId, status) {
  return await apiRequest(`/incidents/${incidentId}/status?status=${encodeURIComponent(status)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

/**
 * =============================================================================
 * Chaos & Distributed Systems Interactive API Methods
 * =============================================================================
 */

export async function getChaosStatus() {
  return await apiRequest('/coordinator/chaos');
}

export async function setNodeChaosMode(zoneId, mode) {
  return await apiRequest('/coordinator/chaos/toggle', {
    method: 'POST',
    body: JSON.stringify({ zoneId, mode })
  });
}

export async function resetChaos() {
  return await apiRequest('/coordinator/chaos/reset', {
    method: 'POST'
  });
}

export async function triggerSurgeSimulation(count = 6) {
  return await apiRequest('/coordinator/chaos/surge', {
    method: 'POST',
    body: JSON.stringify({ count })
  });
}

export async function runIdempotencyExperiment() {
  return await apiRequest('/coordinator/chaos/test-idempotency', {
    method: 'POST'
  });
}
