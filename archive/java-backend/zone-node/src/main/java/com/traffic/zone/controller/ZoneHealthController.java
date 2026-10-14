package com.traffic.zone.controller;

import com.traffic.common.dto.ZoneHealthDto;
import com.traffic.zone.service.ZoneIncidentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Health telemetry endpoint used by monitoring agents and the coordinator service.
 */
@RestController
@RequestMapping("/api/health")
public class ZoneHealthController {

    private final ZoneIncidentService incidentService;

    public ZoneHealthController(ZoneIncidentService incidentService) {
        this.incidentService = incidentService;
    }

    /**
     * Check health, uptime, and incident volume of this zone node.
     * Response: 200 OK with ZoneHealthDto.
     */
    @GetMapping
    public ResponseEntity<ZoneHealthDto> checkHealth() {
        return ResponseEntity.ok(incidentService.getHealth());
    }
}
