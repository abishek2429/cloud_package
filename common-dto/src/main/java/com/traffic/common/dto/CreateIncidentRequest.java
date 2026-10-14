package com.traffic.common.dto;

import com.traffic.common.model.IncidentSeverity;
import com.traffic.common.model.IncidentStatus;
import com.traffic.common.model.IncidentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Payload for reporting a new traffic incident.
 */
public class CreateIncidentRequest {

    /**
     * Optional unique incident ID (idempotency key).
     * If specified by the client or coordinator, retries with the same ID will detect
     * the existing incident without creating duplicates.
     */
    private String id;

    /**
     * Target zone identifier (e.g. NORTH, CENTRAL, SOUTH).
     * Optional when submitting directly to a zone node (which auto-assigns its own zone ID);
     * Required when submitting through the central coordinator for routing.
     */
    private String zoneId;

    @NotNull(message = "Incident type is required (TRAFFIC_JAM, ACCIDENT, ROAD_CLOSED)")
    private IncidentType type;

    @NotNull(message = "Incident severity is required (LOW, MEDIUM, HIGH)")
    private IncidentSeverity severity;

    @NotBlank(message = "Incident description cannot be blank")
    @Size(min = 5, max = 500, message = "Description must be between 5 and 500 characters")
    private String description;

    private IncidentStatus status; // Optional; defaults to ACTIVE in service layer if null

    public CreateIncidentRequest() {
    }

    public CreateIncidentRequest(String zoneId, IncidentType type, IncidentSeverity severity,
                                 String description, IncidentStatus status) {
        this(null, zoneId, type, severity, description, status);
    }

    public CreateIncidentRequest(String id, String zoneId, IncidentType type, IncidentSeverity severity,
                                 String description, IncidentStatus status) {
        this.id = id;
        this.zoneId = zoneId;
        this.type = type;
        this.severity = severity;
        this.description = description;
        this.status = status;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getZoneId() {
        return zoneId;
    }

    public void setZoneId(String zoneId) {
        this.zoneId = zoneId;
    }

    public IncidentType getType() {
        return type;
    }

    public void setType(IncidentType type) {
        this.type = type;
    }

    public IncidentSeverity getSeverity() {
        return severity;
    }

    public void setSeverity(IncidentSeverity severity) {
        this.severity = severity;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public IncidentStatus getStatus() {
        return status;
    }

    public void setStatus(IncidentStatus status) {
        this.status = status;
    }
}
