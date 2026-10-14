package com.traffic.zone.controller;

import com.traffic.common.dto.CreateIncidentRequest;
import com.traffic.common.dto.IncidentDto;
import com.traffic.common.dto.UpdateIncidentStatusRequest;
import com.traffic.common.model.IncidentSeverity;
import com.traffic.common.model.IncidentStatus;
import com.traffic.zone.service.ZoneIncidentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller exposing incident lifecycle management for this zone node.
 */
@RestController
@RequestMapping("/api/incidents")
public class ZoneIncidentController {

    private final ZoneIncidentService incidentService;

    public ZoneIncidentController(ZoneIncidentService incidentService) {
        this.incidentService = incidentService;
    }

    /**
     * Report a new incident in this zone.
     * Response: 201 Created with the saved incident object.
     */
    @PostMapping
    public ResponseEntity<IncidentDto> createIncident(@Valid @RequestBody CreateIncidentRequest request) {
        boolean duplicate = request.getId() != null && incidentService.existsById(request.getId());
        IncidentDto created = incidentService.createIncident(request);
        return ResponseEntity.status(duplicate ? HttpStatus.OK : HttpStatus.CREATED).body(created);
    }

    /**
     * Retrieve all incidents in this zone, optionally filtered by severity or status.
     * Response: 200 OK with list of incidents.
     */
    @GetMapping
    public ResponseEntity<List<IncidentDto>> getIncidents(
            @RequestParam(required = false) IncidentSeverity severity,
            @RequestParam(required = false) IncidentStatus status) {
        List<IncidentDto> incidents = incidentService.getAllIncidents(severity, status);
        return ResponseEntity.ok(incidents);
    }

    /**
     * Retrieve an incident by its unique ID.
     * Response: 200 OK or 404 Not Found.
     */
    @GetMapping("/{id}")
    public ResponseEntity<IncidentDto> getIncidentById(@PathVariable String id) {
        IncidentDto incident = incidentService.getIncidentById(id);
        return ResponseEntity.ok(incident);
    }

    /**
     * Update the operational status of an incident (e.g. ACTIVE -> RESOLVED).
     * Response: 200 OK with updated incident.
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<IncidentDto> updateIncidentStatus(
            @PathVariable String id,
            @Valid @RequestBody UpdateIncidentStatusRequest request) {
        IncidentDto updated = incidentService.updateIncidentStatus(id, request.getStatus());
        return ResponseEntity.ok(updated);
    }
}
