package com.traffic.coordinator.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Configuration properties for the coordinator service, including HTTP timeouts,
 * health check monitor intervals/thresholds, retry policies, and target zone cluster topology.
 */
@Component
@ConfigurationProperties(prefix = "coordinator")
public class CoordinatorProperties {

    private HttpProperties http = new HttpProperties();
    private HealthCheckProperties healthCheck = new HealthCheckProperties();
    private RetryProperties retry = new RetryProperties();
    private List<ZoneConfig> zones = new ArrayList<>();

    public HttpProperties getHttp() {
        return http;
    }

    public void setHttp(HttpProperties http) {
        this.http = http;
    }

    public HealthCheckProperties getHealthCheck() {
        return healthCheck;
    }

    public void setHealthCheck(HealthCheckProperties healthCheck) {
        this.healthCheck = healthCheck;
    }

    public RetryProperties getRetry() {
        return retry;
    }

    public void setRetry(RetryProperties retry) {
        this.retry = retry;
    }

    public List<ZoneConfig> getZones() {
        return zones;
    }

    public void setZones(List<ZoneConfig> zones) {
        this.zones = zones;
    }

    public static class HttpProperties {
        private int connectTimeoutMs = 2000;
        private int readTimeoutMs = 2500;

        public int getConnectTimeoutMs() {
            return connectTimeoutMs;
        }

        public void setConnectTimeoutMs(int connectTimeoutMs) {
            this.connectTimeoutMs = connectTimeoutMs;
        }

        public int getReadTimeoutMs() {
            return readTimeoutMs;
        }

        public void setReadTimeoutMs(int readTimeoutMs) {
            this.readTimeoutMs = readTimeoutMs;
        }
    }

    public static class HealthCheckProperties {
        private boolean enabled = true;
        private int intervalMs = 5000;
        private int timeoutMs = 2000;
        private int failureThreshold = 2; // Consecutive failures needed to declare OFFLINE
        private int successThreshold = 2; // Consecutive successes needed to recover to ONLINE

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public int getIntervalMs() {
            return intervalMs;
        }

        public void setIntervalMs(int intervalMs) {
            this.intervalMs = intervalMs;
        }

        public int getTimeoutMs() {
            return timeoutMs;
        }

        public void setTimeoutMs(int timeoutMs) {
            this.timeoutMs = timeoutMs;
        }

        public int getFailureThreshold() {
            return failureThreshold;
        }

        public void setFailureThreshold(int failureThreshold) {
            this.failureThreshold = failureThreshold;
        }

        public int getSuccessThreshold() {
            return successThreshold;
        }

        public void setSuccessThreshold(int successThreshold) {
            this.successThreshold = successThreshold;
        }
    }

    public static class RetryProperties {
        private int maxAttempts = 3;            // Never retry forever (1 initial + 2 retries)
        private long initialBackoffMs = 200;    // Initial delay before first retry
        private double backoffMultiplier = 2.0; // Exponential backoff multiplier
        private long maxBackoffMs = 1000;       // Max bounded delay cap

        public int getMaxAttempts() {
            return maxAttempts;
        }

        public void setMaxAttempts(int maxAttempts) {
            this.maxAttempts = maxAttempts;
        }

        public long getInitialBackoffMs() {
            return initialBackoffMs;
        }

        public void setInitialBackoffMs(long initialBackoffMs) {
            this.initialBackoffMs = initialBackoffMs;
        }

        public double getBackoffMultiplier() {
            return backoffMultiplier;
        }

        public void setBackoffMultiplier(double backoffMultiplier) {
            this.backoffMultiplier = backoffMultiplier;
        }

        public long getMaxBackoffMs() {
            return maxBackoffMs;
        }

        public void setMaxBackoffMs(long maxBackoffMs) {
            this.maxBackoffMs = maxBackoffMs;
        }
    }

    public static class ZoneConfig {
        private String id;
        private String name;
        private String url;

        public ZoneConfig() {
        }

        public ZoneConfig(String id, String name, String url) {
            this.id = id;
            this.name = name;
            this.url = url;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        @Override
        public String toString() {
            return "ZoneConfig{" +
                    "id='" + id + '\'' +
                    ", name='" + name + '\'' +
                    ", url='" + url + '\'' +
                    '}';
        }
    }
}
