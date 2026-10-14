package com.traffic.coordinator.service;

import com.traffic.common.dto.NodeStatusDto;
import com.traffic.common.dto.ZoneHealthDto;
import com.traffic.common.model.NodeStatus;
import com.traffic.coordinator.client.ZoneClient;
import com.traffic.coordinator.config.CoordinatorProperties;
import com.traffic.coordinator.config.CoordinatorProperties.ZoneConfig;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Background Heartbeat & Health Monitoring Service.
 *
 * DISTRIBUTED SYSTEMS ARCHITECTURE NOTE (VIVA / EXAM CONTEXT):
 * 1. Periodic Heartbeats: Continuously monitors downstream partition availability
 *    without waiting for client request triggers.
 * 2. Flapping / Hysteresis Prevention: Transient network hiccups (e.g. GC pause, single packet drop)
 *    must NOT trigger an immediate status flip to OFFLINE. The monitor requires a configurable
 *    consecutive failure threshold (e.g., 2 consecutive failures) before marking a node OFFLINE,
 *    and a success threshold (e.g., 2 consecutive successes) before declaring recovery.
 */
@Service
public class NodeHealthMonitorService {

    private static final Logger log = LoggerFactory.getLogger(NodeHealthMonitorService.class);

    private final CoordinatorProperties properties;
    private final ZoneClient zoneClient;
    private final Map<String, NodeHealthState> nodeStates = new ConcurrentHashMap<>();

    public NodeHealthMonitorService(CoordinatorProperties properties, ZoneClient zoneClient) {
        this.properties = properties;
        this.zoneClient = zoneClient;
    }

    @PostConstruct
    public void initializeNodeStates() {
        for (ZoneConfig zone : properties.getZones()) {
            nodeStates.put(zone.getId().toUpperCase(),
                    new NodeHealthState(zone.getId().toUpperCase(), zone.getName(), zone.getUrl()));
        }
        log.info("Initialized health monitoring for {} zone nodes: {}",
                nodeStates.size(), nodeStates.keySet());
    }

    /**
     * Periodic scheduled health probe execution.
     */
    @Scheduled(fixedDelayString = "${coordinator.health-check.interval-ms:5000}",
               initialDelayString = "${coordinator.health-check.interval-ms:5000}")
    public void scheduledHealthCheck() {
        if (!properties.getHealthCheck().isEnabled()) {
            return;
        }
        pollAllNodes();
    }

    /**
     * Polls all configured zone nodes and updates their state machines.
     */
    public void pollAllNodes() {
        for (ZoneConfig zone : properties.getZones()) {
            pollSingleNode(zone);
        }
    }

    public void pollSingleNode(ZoneConfig zone) {
        String zoneId = zone.getId().toUpperCase();
        NodeHealthState state = nodeStates.computeIfAbsent(zoneId,
                k -> new NodeHealthState(zoneId, zone.getName(), zone.getUrl()));

        long start = System.currentTimeMillis();
        try {
            ZoneHealthDto health = zoneClient.fetchHealth(zone);
            long latency = System.currentTimeMillis() - start;
            int count = health != null ? health.getIncidentCount() : 0;
            handleSuccess(state, latency, count);
        } catch (Exception ex) {
            long latency = System.currentTimeMillis() - start;
            handleFailure(state, latency, ex.getMessage());
        }
    }

    private void handleSuccess(NodeHealthState state, long latencyMs, int incidentCount) {
        state.setConsecutiveFailures(0);
        int successes = state.incrementConsecutiveSuccesses();
        state.setLastResponseTimeMs(latencyMs);
        state.setLastCheckTime(Instant.now());
        state.setLastError(null);
        state.setIncidentCount(incidentCount);

        int threshold = properties.getHealthCheck().getSuccessThreshold();
        if (state.getStatus() == NodeStatus.OFFLINE) {
            if (successes >= threshold) {
                state.setStatus(NodeStatus.ONLINE);
                log.info("STATE TRANSITION [OFFLINE -> ONLINE]: Zone [{}] restored to ONLINE after {} consecutive successful probes (latency: {} ms).",
                        state.getZoneId(), successes, latencyMs);
            } else {
                log.info("RECOVERY IN PROGRESS: Zone [{}] passed probe ({}/{} successes required). Status remains OFFLINE.",
                        state.getZoneId(), successes, threshold);
            }
        }
    }

    private void handleFailure(NodeHealthState state, long latencyMs, String error) {
        state.setConsecutiveSuccesses(0);
        int failures = state.incrementConsecutiveFailures();
        state.setLastResponseTimeMs(latencyMs);
        state.setLastCheckTime(Instant.now());
        state.setLastError(error);

        int threshold = properties.getHealthCheck().getFailureThreshold();
        if (state.getStatus() == NodeStatus.ONLINE) {
            if (failures >= threshold) {
                state.setStatus(NodeStatus.OFFLINE);
                log.warn("STATE TRANSITION [ONLINE -> OFFLINE]: Zone [{}] marked OFFLINE after {} consecutive failures. Reason: {}",
                        state.getZoneId(), failures, error);
            } else {
                log.warn("TRANSIENT PROBE FAILURE: Zone [{}] failed probe ({}/{} failures before offline). Status held as ONLINE to prevent flapping. Reason: {}",
                        state.getZoneId(), failures, threshold, error);
            }
        }
    }

    public List<NodeStatusDto> getAllNodeStatuses() {
        return properties.getZones().stream()
                .map(z -> {
                    NodeHealthState state = nodeStates.get(z.getId().toUpperCase());
                    if (state != null) {
                        return state.toDto();
                    }
                    return NodeStatusDto.offline(z.getId(), z.getName(), z.getUrl(), 0, "Not initialized");
                })
                .collect(Collectors.toList());
    }

    public NodeStatusDto getNodeStatus(String zoneId) {
        NodeHealthState state = nodeStates.get(zoneId.toUpperCase());
        if (state != null) {
            return state.toDto();
        }
        ZoneConfig zone = properties.getZones().stream()
                .filter(z -> z.getId().equalsIgnoreCase(zoneId))
                .findFirst()
                .orElse(null);
        if (zone != null) {
            return NodeStatusDto.offline(zone.getId(), zone.getName(), zone.getUrl(), 0, "No state recorded");
        }
        return NodeStatusDto.offline(zoneId, zoneId, "", 0, "Unknown zone");
    }

    public Map<String, NodeHealthState> getNodeStates() {
        return nodeStates;
    }

    /**
     * Internal mutable state container for a monitored zone partition.
     */
    public static class NodeHealthState {
        private final String zoneId;
        private final String zoneName;
        private final String url;
        private volatile NodeStatus status = NodeStatus.ONLINE; // Default ONLINE until healthcheck confirms or fails
        private volatile int consecutiveFailures = 0;
        private volatile int consecutiveSuccesses = 0;
        private volatile long lastResponseTimeMs = 0;
        private volatile Instant lastCheckTime = Instant.now();
        private volatile String lastError;
        private volatile int incidentCount = 0;

        public NodeHealthState(String zoneId, String zoneName, String url) {
            this.zoneId = zoneId;
            this.zoneName = zoneName;
            this.url = url;
        }

        public String getZoneId() {
            return zoneId;
        }

        public String getZoneName() {
            return zoneName;
        }

        public String getUrl() {
            return url;
        }

        public NodeStatus getStatus() {
            return status;
        }

        public void setStatus(NodeStatus status) {
            this.status = status;
        }

        public int getConsecutiveFailures() {
            return consecutiveFailures;
        }

        public void setConsecutiveFailures(int consecutiveFailures) {
            this.consecutiveFailures = consecutiveFailures;
        }

        public int incrementConsecutiveFailures() {
            return ++this.consecutiveFailures;
        }

        public int getConsecutiveSuccesses() {
            return consecutiveSuccesses;
        }

        public void setConsecutiveSuccesses(int consecutiveSuccesses) {
            this.consecutiveSuccesses = consecutiveSuccesses;
        }

        public int incrementConsecutiveSuccesses() {
            return ++this.consecutiveSuccesses;
        }

        public long getLastResponseTimeMs() {
            return lastResponseTimeMs;
        }

        public void setLastResponseTimeMs(long lastResponseTimeMs) {
            this.lastResponseTimeMs = lastResponseTimeMs;
        }

        public Instant getLastCheckTime() {
            return lastCheckTime;
        }

        public void setLastCheckTime(Instant lastCheckTime) {
            this.lastCheckTime = lastCheckTime;
        }

        public String getLastError() {
            return lastError;
        }

        public void setLastError(String lastError) {
            this.lastError = lastError;
        }

        public int getIncidentCount() {
            return incidentCount;
        }

        public void setIncidentCount(int incidentCount) {
            this.incidentCount = incidentCount;
        }

        public NodeStatusDto toDto() {
            if (status == NodeStatus.ONLINE) {
                return NodeStatusDto.online(zoneId, zoneName, url, lastResponseTimeMs, incidentCount);
            } else {
                return NodeStatusDto.offline(zoneId, zoneName, url, lastResponseTimeMs, lastError);
            }
        }
    }
}
