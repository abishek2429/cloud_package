package com.traffic.coordinator.controller;

import com.traffic.common.dto.CityReportDto;
import com.traffic.common.dto.CreateIncidentRequest;
import com.traffic.common.dto.IncidentDto;
import com.traffic.common.dto.NodeStatusDto;
import com.traffic.common.dto.ZoneHealthDto;
import com.traffic.coordinator.service.AggregationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST API gateway exposed by the central coordinator.
 */
@RestController
@RequestMapping("/api/coordinator")
public class CoordinatorController {

    private final AggregationService aggregationService;
    private final Instant startupTime = Instant.now();

    public CoordinatorController(AggregationService aggregationService) {
        this.aggregationService = aggregationService;
    }

    /**
     * Retrieve aggregated city-wide incident report combining all zone nodes.
     * Response: 200 OK with CityReportDto (includes healthy zones, degraded/offline zones,
     * per-node statuses, and specific error messages).
     */
    @GetMapping({"/city-report", "/incidents"})
    public ResponseEntity<CityReportDto> getCityWideReport() {
        CityReportDto report = aggregationService.aggregateCityReport();
        return ResponseEntity.ok(report);
    }

    /**
     * Retrieve connection health, ping latency, and incident volume of all zone nodes.
     * Response: 200 OK with List<NodeStatusDto>.
     */
    @GetMapping({"/nodes", "/status"})
    public ResponseEntity<List<NodeStatusDto>> getNodeStatuses() {
        List<NodeStatusDto> statuses = aggregationService.checkNodeStatuses();
        return ResponseEntity.ok(statuses);
    }

    /**
     * Retrieve incident reports from a specific zone node via the coordinator.
     * Response: 200 OK with List<IncidentDto>, or 503 if zone is unreachable.
     */
    @GetMapping("/zones/{zoneId}/incidents")
    public ResponseEntity<List<IncidentDto>> getZoneIncidents(@PathVariable String zoneId) {
        List<IncidentDto> incidents = aggregationService.getIncidentsForZone(zoneId);
        return ResponseEntity.ok(incidents);
    }

    /**
     * Retrieve health telemetry from a specific zone node via the coordinator.
     * Response: 200 OK with ZoneHealthDto, or 503 if zone is unreachable.
     */
    @GetMapping("/zones/{zoneId}/health")
    public ResponseEntity<ZoneHealthDto> getZoneHealth(@PathVariable String zoneId) {
        ZoneHealthDto health = aggregationService.getNodeHealthForZone(zoneId);
        return ResponseEntity.ok(health);
    }

    /**
     * Submit an incident report via the coordinator, which routes it to the designated zone.
     * Response: 201 Created with saved IncidentDto.
     */
    @PostMapping("/incidents")
    public ResponseEntity<IncidentDto> submitIncident(@Valid @RequestBody CreateIncidentRequest request) {
        IncidentDto created = aggregationService.routeIncidentCreation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Check coordinator's own service health.
     * Response: 200 OK.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getCoordinatorHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("service", "coordinator-service");
        health.put("status", "UP");
        health.put("timestamp", Instant.now());
        health.put("uptimeSeconds", Duration.between(startupTime, Instant.now()).getSeconds());
        return ResponseEntity.ok(health);
    }
}
