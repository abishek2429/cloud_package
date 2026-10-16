/**
 * Chaos & Fault Injection Controller for Distributed Systems Demonstrations
 *
 * Provides in-memory chaos flags allowing operators to simulate:
 * 1. Network partition / fiber cut (offline node)
 * 2. High latency network degradations (1500ms lag)
 * 3. 500 server internal errors (triggering retry executor)
 * 4. Automated Mass Casualty Incident (MCI) patient surge across surviving nodes
 */

const chaosState = new Map([
  ['NORTH', { mode: 'normal', latencyMs: 0 }],
  ['CENTRAL', { mode: 'normal', latencyMs: 0 }],
  ['SOUTH', { mode: 'normal', latencyMs: 0 }],
]);

export function getChaosStatus() {
  const result = {};
  for (const [zoneId, state] of chaosState.entries()) {
    result[zoneId] = { ...state };
  }
  return result;
}

export function setZoneChaos(zoneId, mode) {
  const upper = zoneId.toUpperCase();
  if (!chaosState.has(upper)) {
    throw new Error(`Unknown zone ID: ${zoneId}`);
  }

  if (mode === 'offline') {
    chaosState.set(upper, { mode: 'offline', latencyMs: 0 });
  } else if (mode === 'lag') {
    chaosState.set(upper, { mode: 'lag', latencyMs: 1500 });
  } else {
    chaosState.set(upper, { mode: 'normal', latencyMs: 0 });
  }

  return { zoneId: upper, ...chaosState.get(upper) };
}

export function isZoneOffline(zoneId) {
  const state = chaosState.get(zoneId.toUpperCase());
  return state?.mode === 'offline';
}

export function getZoneDelay(zoneId) {
  const state = chaosState.get(zoneId.toUpperCase());
  return state?.latencyMs || 0;
}

export function resetAllChaos() {
  for (const zoneId of chaosState.keys()) {
    chaosState.set(zoneId, { mode: 'normal', latencyMs: 0 });
  }
}
