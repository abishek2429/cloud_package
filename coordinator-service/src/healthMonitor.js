import { config } from './config.js';
import { isZoneOffline, getZoneDelay } from './chaos.js';

/**
 * Node Health Monitor with Hysteresis State Machine
 *
 * DISTRIBUTED SYSTEMS ARCHITECTURE NOTE (VIVA / EXAM CONTEXT):
 * 1. Periodic Heartbeats: Continuously monitors downstream partition availability.
 * 2. Flapping / Hysteresis Prevention: Transient network hiccups (e.g. single packet drop)
 *    must NOT trigger an immediate status flip to OFFLINE. The monitor requires a configurable
 *    consecutive failure threshold (2 consecutive failures) before marking a node OFFLINE,
 *    and a success threshold (2 consecutive successes) before declaring recovery to ONLINE.
 */
class NodeHealthMonitor {
  constructor() {
    this.nodeStates = new Map();
    this.intervalHandle = null;

    for (const zone of config.zones) {
      this.nodeStates.set(zone.id.toUpperCase(), {
        zoneId: zone.id.toUpperCase(),
        zoneName: zone.name,
        url: zone.url,
        status: 'ONLINE', // Optimistically start ONLINE
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        lastResponseTimeMs: 0,
        incidentCount: 0,
        lastCheckTime: null,
        lastError: null,
      });
    }
  }

  start() {
    if (!config.healthCheck.enabled) {
      console.log('[HealthMonitor] Background health check is disabled by configuration.');
      return;
    }

    console.log(
      `[HealthMonitor] Initialized health monitoring for ${this.nodeStates.size} zone nodes: [${Array.from(this.nodeStates.keys()).join(', ')}] (Interval: ${config.healthCheck.intervalMs}ms)`
    );

    // Initial check
    this.pollAllNodes();

    // Periodic schedule
    this.intervalHandle = setInterval(() => {
      this.pollAllNodes();
    }, config.healthCheck.intervalMs);
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async pollAllNodes() {
    await Promise.all(config.zones.map((zone) => this.pollSingleNode(zone)));
  }

  async pollSingleNode(zone) {
    const zoneId = zone.id.toUpperCase();
    const state = this.nodeStates.get(zoneId);
    if (!state) return;

    if (isZoneOffline(zoneId)) {
      this.handleFailure(state, 0, 'Simulated Chaos Partition: Network Cable Severed');
      return;
    }

    const delay = getZoneDelay(zoneId);
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }

    const start = Date.now();
    try {
      const response = await fetch(`${zone.url}/api/health`, {
        signal: AbortSignal.timeout(config.healthCheck.timeoutMs + delay),
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.handleSuccess(state, latencyMs, data.incidentCount || 0);
    } catch (err) {
      const latencyMs = Date.now() - start;
      this.handleFailure(state, latencyMs, err.message);
    }
  }

  handleSuccess(state, latencyMs, incidentCount) {
    state.consecutiveFailures = 0;
    state.consecutiveSuccesses++;
    state.lastResponseTimeMs = latencyMs;
    state.lastCheckTime = new Date().toISOString();
    state.lastError = null;
    state.incidentCount = incidentCount;

    const threshold = config.healthCheck.successThreshold;
    if (state.status === 'OFFLINE') {
      if (state.consecutiveSuccesses >= threshold) {
        state.status = 'ONLINE';
        console.log(
          `[HealthMonitor] STATE TRANSITION [OFFLINE -> ONLINE]: Zone [${state.zoneId}] restored to ONLINE after ${state.consecutiveSuccesses} consecutive successful probes (latency: ${latencyMs}ms).`
        );
      } else {
        console.log(
          `[HealthMonitor] RECOVERY IN PROGRESS: Zone [${state.zoneId}] passed probe (${state.consecutiveSuccesses}/${threshold} successes required). Status remains OFFLINE.`
        );
      }
    }
  }

  handleFailure(state, latencyMs, errorMessage) {
    state.consecutiveSuccesses = 0;
    state.consecutiveFailures++;
    state.lastResponseTimeMs = latencyMs;
    state.lastCheckTime = new Date().toISOString();
    state.lastError = errorMessage;

    const threshold = config.healthCheck.failureThreshold;
    if (state.status === 'ONLINE') {
      if (state.consecutiveFailures >= threshold) {
        state.status = 'OFFLINE';
        console.warn(
          `[HealthMonitor] STATE TRANSITION [ONLINE -> OFFLINE]: Zone [${state.zoneId}] marked OFFLINE after ${state.consecutiveFailures} consecutive failures. Reason: ${errorMessage}`
        );
      } else {
        console.warn(
          `[HealthMonitor] TRANSIENT PROBE FAILURE: Zone [${state.zoneId}] failed probe (${state.consecutiveFailures}/${threshold} failures before offline). Status held as ONLINE to prevent flapping. Reason: ${errorMessage}`
        );
      }
    }
  }

  getAllNodeStatuses() {
    return Array.from(this.nodeStates.values()).map((state) => ({
      zoneId: state.zoneId,
      zoneName: state.zoneName,
      url: state.url,
      status: state.status,
      responseTimeMs: state.lastResponseTimeMs,
      incidentCount: state.incidentCount,
      errorMessage: state.status === 'OFFLINE' ? state.lastError : null,
      lastCheckTime: state.lastCheckTime,
    }));
  }

  getNodeStatus(zoneId) {
    const state = this.nodeStates.get(zoneId.toUpperCase());
    if (state) {
      return {
        zoneId: state.zoneId,
        zoneName: state.zoneName,
        url: state.url,
        status: state.status,
        responseTimeMs: state.lastResponseTimeMs,
        incidentCount: state.incidentCount,
        errorMessage: state.status === 'OFFLINE' ? state.lastError : null,
      };
    }
    return {
      zoneId: zoneId.toUpperCase(),
      zoneName: zoneId.toUpperCase(),
      url: '',
      status: 'OFFLINE',
      responseTimeMs: 0,
      incidentCount: 0,
      errorMessage: 'Unknown zone',
    };
  }
}

export const healthMonitor = new NodeHealthMonitor();
