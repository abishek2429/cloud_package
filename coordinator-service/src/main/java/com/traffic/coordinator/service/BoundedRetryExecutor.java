package com.traffic.coordinator.service;

import com.traffic.coordinator.config.CoordinatorProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Bounded Retry Executor implementing exponential backoff.
 *
 * DISTRIBUTED SYSTEMS ARCHITECTURE NOTE (VIVA / EXAM CONTEXT):
 * 1. Bounded Retries: Retrying infinitely on distributed network failure causes thundering
 *    herds and thread pool exhaustion (Cascading Failure). Retries MUST be bounded.
 * 2. Exponential Backoff: Introduces progressive delays between attempts to allow
 *    transient network partitions or service restarts to heal before the next attempt.
 */
@Component
public class BoundedRetryExecutor {

    private static final Logger log = LoggerFactory.getLogger(BoundedRetryExecutor.class);

    private final CoordinatorProperties properties;

    public BoundedRetryExecutor(CoordinatorProperties properties) {
        this.properties = properties;
    }

    @FunctionalInterface
    public interface RetryableAction<T> {
        T execute() throws Exception;
    }

    public <T> T execute(String operationName, RetryableAction<T> action) throws Exception {
        int maxAttempts = Math.max(1, properties.getRetry().getMaxAttempts());
        long backoffMs = properties.getRetry().getInitialBackoffMs();
        double multiplier = properties.getRetry().getBackoffMultiplier();
        long maxBackoffMs = properties.getRetry().getMaxBackoffMs();

        int attempt = 0;
        while (true) {
            attempt++;
            try {
                return action.execute();
            } catch (Exception ex) {
                if (attempt >= maxAttempts) {
                    log.error("BOUNDED RETRY EXHAUSTED: Operation [{}] failed after {} bounded attempts. Final error: {}",
                            operationName, attempt, ex.getMessage());
                    throw ex;
                }

                log.warn("RETRY ATTEMPT [{}/{}]: Operation [{}] failed ({}). Backing off for {} ms...",
                        attempt, maxAttempts, operationName, ex.getMessage(), backoffMs);

                try {
                    Thread.sleep(backoffMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Retry operation interrupted", ie);
                }

                backoffMs = Math.min((long) (backoffMs * multiplier), maxBackoffMs);
            }
        }
    }
}
