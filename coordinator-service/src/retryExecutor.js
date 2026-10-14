import { config } from './config.js';

/**
 * Bounded Retry Executor
 *
 * Executes an asynchronous operation with bounded attempts and exponential backoff.
 * Strictly guarantees that retries will terminate after maxAttempts, avoiding infinite loops
 * and worker thread pool starvation.
 */
export async function executeWithRetry(operationName, fn, customOptions = {}) {
  const options = {
    maxAttempts: customOptions.maxAttempts || config.retry.maxAttempts,
    initialBackoffMs: customOptions.initialBackoffMs || config.retry.initialBackoffMs,
    backoffMultiplier: customOptions.backoffMultiplier || config.retry.backoffMultiplier,
    maxBackoffMs: customOptions.maxBackoffMs || config.retry.maxBackoffMs,
  };

  let currentDelay = options.initialBackoffMs;
  let lastError = null;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[Retry] Retrying operation [${operationName}] (Attempt ${attempt}/${options.maxAttempts})...`);
      }
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= options.maxAttempts) {
        break;
      }

      console.warn(
        `[Retry] Operation [${operationName}] failed on attempt ${attempt}/${options.maxAttempts}: ${err.message}. Backing off for ${currentDelay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay = Math.min(Math.round(currentDelay * options.backoffMultiplier), options.maxBackoffMs);
    }
  }

  console.error(
    `[Retry] BOUNDED RETRY EXHAUSTED: Operation [${operationName}] failed after ${options.maxAttempts} bounded attempts. Final error: ${lastError?.message}`
  );
  throw lastError;
}
