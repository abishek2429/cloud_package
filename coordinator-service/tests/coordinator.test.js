import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { executeWithRetry } from '../src/retryExecutor.js';
import { healthMonitor } from '../src/healthMonitor.js';

describe('Coordinator Service - Bounded Retry Executor Tests', () => {
  test('Succeeds on first attempt without retrying', async () => {
    let callCount = 0;
    const result = await executeWithRetry(
      'test-success',
      async () => {
        callCount++;
        return 'SUCCESS';
      },
      { maxAttempts: 3, initialBackoffMs: 10, backoffMultiplier: 2.0, maxBackoffMs: 50 }
    );

    assert.equal(result, 'SUCCESS');
    assert.equal(callCount, 1);
  });

  test('Recovers after initial transient failure with exponential backoff', async () => {
    let callCount = 0;
    const result = await executeWithRetry(
      'test-transient',
      async () => {
        callCount++;
        if (callCount < 2) {
          throw new Error('Transient connection reset');
        }
        return 'RECOVERED';
      },
      { maxAttempts: 3, initialBackoffMs: 10, backoffMultiplier: 2.0, maxBackoffMs: 50 }
    );

    assert.equal(result, 'RECOVERED');
    assert.equal(callCount, 2);
  });

  test('Never retries forever: aborts after bounded attempts with exception', async () => {
    let callCount = 0;
    await assert.rejects(
      async () => {
        await executeWithRetry(
          'test-exhausted',
          async () => {
            callCount++;
            throw new Error('Persistent network partition');
          },
          { maxAttempts: 3, initialBackoffMs: 10, backoffMultiplier: 2.0, maxBackoffMs: 50 }
        );
      },
      {
        message: 'Persistent network partition',
      }
    );

    assert.equal(callCount, 3);
  });
});

describe('Coordinator Service - Health Monitor Hysteresis Tests', () => {
  test('Hysteresis: Single failure does not flip status to OFFLINE (anti-flapping)', () => {
    const state = {
      zoneId: 'SOUTH',
      status: 'ONLINE',
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastResponseTimeMs: 0,
    };

    // First failure: threshold is 2, so status must remain ONLINE
    healthMonitor.handleFailure(state, 50, 'Temporary timeout');
    assert.equal(state.status, 'ONLINE');
    assert.equal(state.consecutiveFailures, 1);
  });

  test('Hysteresis: Two consecutive failures transition status to OFFLINE', () => {
    const state = {
      zoneId: 'SOUTH',
      status: 'ONLINE',
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastResponseTimeMs: 0,
    };

    // First failure
    healthMonitor.handleFailure(state, 50, 'Timeout 1');
    assert.equal(state.status, 'ONLINE');

    // Second failure: reaches failureThreshold = 2
    healthMonitor.handleFailure(state, 50, 'Timeout 2');
    assert.equal(state.status, 'OFFLINE');
    assert.equal(state.consecutiveFailures, 2);
  });

  test('Hysteresis Recovery: Requires consecutive successes before restoring ONLINE', () => {
    const state = {
      zoneId: 'SOUTH',
      status: 'OFFLINE',
      consecutiveFailures: 2,
      consecutiveSuccesses: 0,
      lastResponseTimeMs: 0,
    };

    // First success: threshold is 2, status must remain OFFLINE
    healthMonitor.handleSuccess(state, 30, 2);
    assert.equal(state.status, 'OFFLINE');
    assert.equal(state.consecutiveSuccesses, 1);

    // Second success: reaches successThreshold = 2, transitions to ONLINE
    healthMonitor.handleSuccess(state, 25, 2);
    assert.equal(state.status, 'ONLINE');
    assert.equal(state.consecutiveSuccesses, 2);
    assert.equal(state.consecutiveFailures, 0);
  });
});
