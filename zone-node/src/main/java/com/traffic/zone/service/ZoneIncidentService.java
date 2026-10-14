package com.traffic.zone.service;

import com.traffic.common.dto.CreateIncidentRequest;
import com.traffic.common.dto.IncidentDto;
import com.traffic.common.dto.ZoneHealthDto;
import com.traffic.common.model.IncidentSeverity;
import com.traffic.common.model.IncidentStatus;
import com.traffic.common.model.IncidentType;
import com.traffic.zone.config.ZoneProperties;
import com.traffic.zone.exception.ResourceNotFoundException;
import com.traffic.zone.repository.IncidentRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Service orchestrating incident lifecycle operations, duplicate detection,
 * durable storage in PostgreSQL, and node telemetry.
 */
@Service
public class ZoneIncidentService {

    private static final Logger log = LoggerFactory.getLogger(ZoneIncidentService.class);

    private final IncidentRepository repository;
    private final ZoneProperties zoneProperties;
    private final Instant startupTime = Instant.now();
    private final AtomicInteger incidentSequence = new AtomicInteger(100);

    public ZoneIncidentService(IncidentRepository repository, ZoneProperties zoneProperties) {
        this.repository = repository;
        this.zoneProperties = zoneProperties;
    }

    @PostConstruct
    public void seedInitialDemoIncidents() {
        String zoneId = zoneProperties.getId().toUpperCase();
        String zoneName = zoneProperties.getName();

        // Ensure zone identity exists in database
        repository.ensureZoneExists(zoneId, zoneName);

        // Check for existing persisted data (Durable Recovery Check)
        int existingCount = repository.countByZoneId(zoneId);
        if (existingCount > 0) {
            log.info("DURABLE RECOVERY: Found {} existing persisted incidents for zone [{}] in PostgreSQL. Preserving data and skipping demo seeding.",
                    existingCount, zoneId);
            return;
        }

        // First time initialization: seed baseline incidents
        log.info("First-time initialization: Seeding demo incidents for zone [{}] into PostgreSQL...", zoneId);
        if ("NORTH".equalsIgnoreCase(zoneId)) {
            createIncident(new CreateIncidentRequest(
                    zoneId,
                    IncidentType.ACCIDENT,
                    IncidentSeverity.HIGH,
                    "Multi-vehicle collision on North Expressway near Mile 14",
                    IncidentStatus.ACTIVE
            ));
            createIncident(new CreateIncidentRequest(
                    zoneId,
                    IncidentType.TRAFFIC_JAM,
                    IncidentSeverity.MEDIUM,
                    "Heavy peak-hour congestion around North Metro interchange",
                    IncidentStatus.INVESTIGATING
            ));
        } else if ("CENTRAL".equalsIgnoreCase(zoneId)) {
            createIncident(new CreateIncidentRequest(
                    zoneId,
                    IncidentType.ROAD_CLOSED,
                    IncidentSeverity.HIGH,
                    "Main Central Boulevard closed for emergency water main repair",
                    IncidentStatus.ACTIVE
            ));
            createIncident(new CreateIncidentRequest(
                    zoneId,
                    IncidentType.TRAFFIC_JAM,
                    IncidentSeverity.LOW,
                    "Slow-moving traffic near Central Plaza shopping district",
                    IncidentStatus.ACTIVE
            ));
        } else if ("SOUTH".equalsIgnoreCase(zoneId)) {
            createIncident(new CreateIncidentRequest(
                    zoneId,
                    IncidentType.TRAFFIC_JAM,
                    IncidentSeverity.MEDIUM,
                    "Southbound bridge bottleneck due to maintenance lane closure",
                    IncidentStatus.ACTIVE
            ));
        }
        log.info("Initialized {} with {} seeded demo incidents", zoneProperties.getName(), repository.countByZoneId(zoneId));
    }

    /**
     * Creates a new incident or returns the existing incident if duplicate ID is supplied (Idempotent).
     */
    public IncidentDto createIncident(CreateIncidentRequest request) {
        String zoneId = zoneProperties.getId().toUpperCase();

        // 1. Determine unique incident ID (use client/coordinator supplied idempotency ID, or generate new)
        String uniqueId;
        if (request.getId() != null && !request.getId().trim().isEmpty()) {
            uniqueId = request.getId().trim();
        } else {
            int seq = incidentSequence.incrementAndGet();
            uniqueId = String.format("INC-%s-%d-%s",
                    zoneId,
                    seq,
                    UUID.randomUUID().toString().substring(0, 4).toUpperCase());
        }

        // 2. Duplicate Detection: Check if incident already exists
        Optional<IncidentDto> existing = repository.findById(uniqueId);
        if (existing.isPresent()) {
            log.warn("DUPLICATE INCIDENT DETECTED: Incident [{}] already exists in zone {}. Returning existing record (Idempotent submission).",
                    uniqueId, zoneId);
            return existing.get();
        }

        IncidentStatus status = request.getStatus() != null ? request.getStatus() : IncidentStatus.ACTIVE;

        IncidentDto incident = new IncidentDto(
                uniqueId,
                zoneId,
                request.getType(),
                request.getSeverity(),
                request.getDescription(),
                Instant.now(),
                status
        );

        try {
            IncidentDto saved = repository.save(incident);
            log.info("DURABLE PERSISTENCE: Saved incident [{}] in zone {}: type={}, severity={}, status={}",
                    uniqueId, zoneId, saved.getType(), saved.getSeverity(), saved.getStatus());
            return saved;
        } catch (DataIntegrityViolationException dive) {
            // Concurrency race: Another thread just inserted the same ID
            log.warn("Concurrent duplicate insertion for incident ID [{}]. Fetching and returning existing record.", uniqueId);
            return repository.findById(uniqueId)
                    .orElseThrow(() -> new IllegalStateException("Failed to recover incident after constraint violation: " + uniqueId));
        }
    }

    public boolean existsById(String id) {
        return repository.existsById(id);
    }

    public List<IncidentDto> getAllIncidents(IncidentSeverity severity, IncidentStatus status) {
        String zoneId = zoneProperties.getId().toUpperCase();
        if (severity != null) {
            return repository.findByZoneIdAndSeverity(zoneId, severity);
        }
        if (status != null) {
            return repository.findByZoneIdAndStatus(zoneId, status);
        }
        return repository.findByZoneId(zoneId);
    }

    public IncidentDto getIncidentById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        String.format("Incident with ID '%s' not found in zone %s", id, zoneProperties.getId())));
    }

    public IncidentDto updateIncidentStatus(String id, IncidentStatus status) {
        return repository.updateStatus(id, status)
                .orElseThrow(() -> new ResourceNotFoundException(
                        String.format("Cannot update status: Incident '%s' not found in zone %s", id, zoneProperties.getId())));
    }

    public ZoneHealthDto getHealth() {
        long uptimeSeconds = Duration.between(startupTime, Instant.now()).getSeconds();
        return new ZoneHealthDto(
                zoneProperties.getId(),
                zoneProperties.getName(),
                "UP",
                Instant.now(),
                repository.countByZoneId(zoneProperties.getId().toUpperCase()),
                uptimeSeconds
        );
    }
}
