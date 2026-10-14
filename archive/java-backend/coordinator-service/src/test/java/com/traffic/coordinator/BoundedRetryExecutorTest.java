package com.traffic.coordinator;

import com.traffic.coordinator.config.CoordinatorProperties;
import com.traffic.coordinator.service.BoundedRetryExecutor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class BoundedRetryExecutorTest {

    private CoordinatorProperties properties;
    private BoundedRetryExecutor retryExecutor;

    @BeforeEach
    void setUp() {
        properties = new CoordinatorProperties();
        properties.getRetry().setMaxAttempts(3);
        properties.getRetry().setInitialBackoffMs(5); // fast for tests
        properties.getRetry().setBackoffMultiplier(1.0);
        properties.getRetry().setMaxBackoffMs(10);
        retryExecutor = new BoundedRetryExecutor(properties);
    }

    @Test
    @DisplayName("Succeeds on first attempt without retrying")
    void testSuccessfulExecutionWithoutRetry() throws Exception {
        AtomicInteger attempts = new AtomicInteger(0);
        String result = retryExecutor.execute("fast-task", () -> {
            attempts.incrementAndGet();
            return "SUCCESS";
        });

        assertEquals("SUCCESS", result);
        assertEquals(1, attempts.get());
    }

    @Test
    @DisplayName("Succeeds on retry attempt after initial failure")
    void testSucceedsAfterInitialFailures() throws Exception {
        AtomicInteger attempts = new AtomicInteger(0);
        String result = retryExecutor.execute("flaky-task", () -> {
            int current = attempts.incrementAndGet();
            if (current < 2) {
                throw new RuntimeException("Transient failure");
            }
            return "RECOVERED";
        });

        assertEquals("RECOVERED", result);
        assertEquals(2, attempts.get());
    }

    @Test
    @DisplayName("Never retries forever: throws exception after max bounded attempts exhausted")
    void testNeverRetriesForever() {
        AtomicInteger attempts = new AtomicInteger(0);

        Exception thrown = assertThrows(RuntimeException.class, () -> {
            retryExecutor.execute("permanent-failure-task", () -> {
                attempts.incrementAndGet();
                throw new RuntimeException("Downstream unavailable");
            });
        });

        assertEquals("Downstream unavailable", thrown.getMessage());
        assertEquals(3, attempts.get(), "Execution must terminate after exactly maxAttempts (3) and never retry infinitely");
    }
}
