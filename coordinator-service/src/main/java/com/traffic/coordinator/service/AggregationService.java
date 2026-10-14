package com.traffic.coordinator.service;

import com.traffic.common.dto.*;
import com.traffic.common.model.IncidentSeverity;
import com.traffic.common.model.IncidentStatus;
import com.traffic.common.model.SystemStatus;
import com.traffic.coordinator.client.ZoneClient;
import com.traffic.coordinator.config.CoordinatorProperties;
import com.traffic.coordinator.config.CoordinatorProperties.ZoneConfig;
import com.traffic.coordinator.exception.ZoneUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Aggregation and Resilience Service.
 *
 * DISTRIBUTED SYSTEMS ARCHITECTURE NOTE (VIVA / EXAM CONTEXT):
 * 1. Scatter-Gather / Fan-Out Pattern:
 *    To aggregate city-wide reports, the coordinator broadcasts requests to all
 *    configured zone partitions concurrently via CompletableFuture. This prevents
 *    cumulative network latency (O(max(Ti)) vs O(sum(Ti))).
 *
 * 2. Fault Tolerance & Graceful Degradation:
 *    Distributed systems must tolerate partial failure (Fallacies of Distributed Computing).
 *    If an individual zone node crashes or the network partitions:
 *    - The timeout triggers or connection refusal is intercepted.
 *    - The failed zone is registered under 'unavailableZones'.
 *    - Specific error message is captured per node under 'nodeErrors'.
 *    - Partial results from healthy zones are synthesized and returned.
 *    - System status transitions to PARTIALLY_DEGRADED.
 *    - The client receives a useful response rather than an HTTP 500 failure.
 *
 * 3. Bounded Retries & Idempotency:
 *    Incident routing uses BoundedRetryExecutor with exponential backoff.
 *    A deterministic unique incident ID is assigned prior to initial dispatch so that
 *    subsequent retry attempts do not duplicate records on downstream zone nodes.
 */
@Service
public class AggregationService {

    private static final Logger log = LoggerFactory.getLogger(AggregationService.class);

    private final CoordinatorProperties properties;
    private final ZoneClient zoneClient;
    private final BoundedRetryExecutor retryExecutor;
    private final NodeHealthMonitorService healthMonitorService;

    public AggregationService(CoordinatorProperties properties,
                              ZoneClient zoneClient,
                              BoundedRetryExecutor retryExecutor,
                              NodeHealthMonitorService healthMonitorService) {
        this.properties = properties;
        this.zoneClient = zoneClient;
        this.retryExecutor = retryExecutor;
        this.healthMonitorService = healthMonitorService;
    }

    /**
     * Aggregates incident reports from all available zone nodes with graceful degradation.
     * Returns partial results when a node is down, with clear per-node status and errors.
     */
    public CityReportDto aggregateCityReport() {
        List<ZoneConfig> configuredZones = properties.getZones();
        Instant startTime = Instant.now();

        // Concurrently query each zone partition
        List<CompletableFuture<ZoneQueryResult>> futures = configuredZones.stream()
                .map(zone -> CompletableFuture.supplyAsync(() -> queryZoneIncidents(zone)))
                .collect(Collectors.toList());

        // Await all zone queries with bounded execution
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        List<ZoneQueryResult> results = futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList());

        CityReportDto report = new CityReportDto();
        report.setTotalConfiguredZones(configuredZones.size());
        report.setGeneratedAt(Instant.now());

        List<IncidentDto> allIncidents = new ArrayList<>();
        List<String> respondingZones = new ArrayList<>();
        List<String> unavailableZones = new ArrayList<>();
        Map<String, String> nodeErrors = new HashMap<>();
        List<NodeStatusDto> nodeStatuses = new ArrayList<>();

        for (ZoneQueryResult result : results) {
            if (result.isSuccess()) {
                respondingZones.add(result.getZoneId());
                if (result.getIncidents() != null) {
                    allIncidents.addAll(result.getIncidents());
                }
                nodeStatuses.add(NodeStatusDto.online(
                        result.getZoneId(),
                        result.getZoneName(),
                        result.getUrl(),
                        result.getResponseTimeMs(),
                        result.getIncidents() != null ? result.getIncidents().size() : 0));
            } else {
                unavailableZones.add(result.getZoneId());
                nodeErrors.put(result.getZoneId(), result.getErrorMessage());
                nodeStatuses.add(NodeStatusDto.offline(
                        result.getZoneId(),
                        result.getZoneName(),
                        result.getUrl(),
                        result.getResponseTimeMs(),
                        result.getErrorMessage()));
                log.warn("Degraded aggregation: Zone [{}] is unavailable (Reason: {})",
                        result.getZoneId(), result.getErrorMessage());
            }
        }

        // Sort all incidents descending by timestamp
        allIncidents.sort(Comparator.comparing(IncidentDto::getTimestamp).reversed());
        report.setIncidents(allIncidents);
        report.setRespondingZones(respondingZones);
        report.setUnavailableZones(unavailableZones);
        report.setNodeErrors(nodeErrors);
        report.setNodeStatuses(nodeStatuses);

        // Compute aggregate metrics
        report.setTotalIncidents(allIncidents.size());
        report.setActiveIncidents((int) allIncidents.stream()
                .filter(i -> i.getStatus() == IncidentStatus.ACTIVE).count());
        report.setInvestigatingIncidents((int) allIncidents.stream()
                .filter(i -> i.getStatus() == IncidentStatus.INVESTIGATING).count());
        report.setResolvedIncidents((int) allIncidents.stream()
                .filter(i -> i.getStatus() == IncidentStatus.RESOLVED).count());

        report.setHighSeverityCount((int) allIncidents.stream()
                .filter(i -> i.getSeverity() == IncidentSeverity.HIGH).count());
        report.setMediumSeverityCount((int) allIncidents.stream()
                .filter(i -> i.getSeverity() == IncidentSeverity.MEDIUM).count());
        report.setLowSeverityCount((int) allIncidents.stream()
                .filter(i -> i.getSeverity() == IncidentSeverity.LOW).count());

        // Determine distributed system health status
        if (unavailableZones.isEmpty()) {
            report.setSystemStatus(SystemStatus.HEALTHY);
        } else if (respondingZones.isEmpty()) {
            report.setSystemStatus(SystemStatus.CRITICAL);
        } else {
            report.setSystemStatus(SystemStatus.PARTIALLY_DEGRADED);
        }

        log.info("Aggregated city report completed in {} ms: {} incidents from {}/{} zones responding. System status: {}",
                System.currentTimeMillis() - startTime.toEpochMilli(),
                report.getTotalIncidents(), respondingZones.size(), configuredZones.size(), report.getSystemStatus());

        return report;
    }

    /**
     * Inspects the health, latency, and operational status of every configured zone node
     * utilizing health monitor hysteresis states.
     */
    public List<NodeStatusDto> checkNodeStatuses() {
        healthMonitorService.pollAllNodes();
        return healthMonitorService.getAllNodeStatuses();
    }

    /**
     * Fetches incidents from a specific zone node via the coordinator.
     */
    public List<IncidentDto> getIncidentsForZone(String zoneId) {
        ZoneConfig targetZone = findZoneConfig(zoneId);
        try {
            List<IncidentDto> incidents = zoneClient.fetchIncidents(targetZone);
            return incidents != null ? incidents : Collections.emptyList();
        } catch (Exception ex) {
            String errorMsg = String.format("Failed to fetch incidents from zone '%s' at %s: %s",
                    targetZone.getId(), targetZone.getUrl(), ex.getMessage());
            log.error(errorMsg);
            throw new ZoneUnavailableException(targetZone.getId(), errorMsg, ex);
        }
    }

    /**
     * Fetches health telemetry from a specific zone node via the coordinator.
     */
    public ZoneHealthDto getNodeHealthForZone(String zoneId) {
        ZoneConfig targetZone = findZoneConfig(zoneId);
        try {
            return zoneClient.fetchHealth(targetZone);
        } catch (Exception ex) {
            String errorMsg = String.format("Failed to fetch health from zone '%s' at %s: %s",
                    targetZone.getId(), targetZone.getUrl(), ex.getMessage());
            log.error(errorMsg);
            throw new ZoneUnavailableException(targetZone.getId(), errorMsg, ex);
        }
    }

    /**
     * Routes an incident submission to the designated target zone node with bounded retries
     * and idempotency ID assignment.
     */
    public IncidentDto routeIncidentCreation(CreateIncidentRequest request) {
        if (request.getZoneId() == null || request.getZoneId().trim().isEmpty()) {
            throw new IllegalArgumentException("A valid target zoneId is required for coordinator submission (e.g., NORTH, CENTRAL, SOUTH)");
        }

        ZoneConfig targetZone = findZoneConfig(request.getZoneId());

        // Assign a deterministic unique incident ID (idempotency key) prior to network dispatch
        // so that any bounded retry attempts send the exact same ID, avoiding duplicate records.
        if (request.getId() == null || request.getId().trim().isEmpty()) {
            String genId = String.format("INC-%s-%d-%s",
                    targetZone.getId().toUpperCase(),
                    System.currentTimeMillis() % 1000000,
                    UUID.randomUUID().toString().substring(0, 4).toUpperCase());
            request.setId(genId);
        }

        try {
            return retryExecutor.execute("routeIncidentCreation-" + targetZone.getId(), () ->
                    zoneClient.createIncident(targetZone, request));
        } catch (Exception ex) {
            String errorMsg = String.format("Failed to route incident to zone '%s' at %s: %s",
                    targetZone.getId(), targetZone.getUrl(), ex.getMessage());
            log.error(errorMsg);
            throw new ZoneUnavailableException(targetZone.getId(), errorMsg, ex);
        }
    }

    private ZoneConfig findZoneConfig(String zoneId) {
        if (zoneId == null || zoneId.trim().isEmpty()) {
            throw new IllegalArgumentException("Zone ID must be specified (e.g., NORTH, CENTRAL, SOUTH)");
        }
        String normalizedId = zoneId.trim().toUpperCase();
        return properties.getZones().stream()
                .filter(z -> z.getId().equalsIgnoreCase(normalizedId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        String.format("Unknown target zone '%s'. Configured zones: %s",
                                normalizedId,
                                properties.getZones().stream().map(ZoneConfig::getId).collect(Collectors.joining(", ")))));
    }

    private ZoneQueryResult queryZoneIncidents(ZoneConfig zone) {
        long start = System.currentTimeMillis();
        try {
            List<IncidentDto> incidents = zoneClient.fetchIncidents(zone);
            long latency = System.currentTimeMillis() - start;
            return ZoneQueryResult.success(zone.getId(), zone.getName(), zone.getUrl(), latency,
                    incidents != null ? incidents : Collections.emptyList());
        } catch (Exception ex) {
            long latency = System.currentTimeMillis() - start;
            return ZoneQueryResult.failure(zone.getId(), zone.getName(), zone.getUrl(), latency, ex.getMessage());
        }
    }

    /**
     * Internal container holding the result and diagnostic latency of a single zone query.
     */
    private static class ZoneQueryResult {
        private final String zoneId;
        private final String zoneName;
        private final String url;
        private final long responseTimeMs;
        private final boolean success;
        private final List<IncidentDto> incidents;
        private final String errorMessage;

        private ZoneQueryResult(String zoneId, String zoneName, String url, long responseTimeMs,
                                boolean success, List<IncidentDto> incidents, String errorMessage) {
            this.zoneId = zoneId;
            this.zoneName = zoneName;
            this.url = url;
            this.responseTimeMs = responseTimeMs;
            this.success = success;
            this.incidents = incidents;
            this.errorMessage = errorMessage;
        }

        public static ZoneQueryResult success(String zoneId, String zoneName, String url, long latency, List<IncidentDto> incidents) {
            return new ZoneQueryResult(zoneId, zoneName, url, latency, true, incidents, null);
        }

        public static ZoneQueryResult failure(String zoneId, String zoneName, String url, long latency, String errorMessage) {
            return new ZoneQueryResult(zoneId, zoneName, url, latency, false, Collections.emptyList(), errorMessage);
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

        public long getResponseTimeMs() {
            return responseTimeMs;
        }

        public boolean isSuccess() {
            return success;
        }

        public List<IncidentDto> getIncidents() {
            return incidents;
        }

        public String getErrorMessage() {
            return errorMessage;
        }
    }
}
