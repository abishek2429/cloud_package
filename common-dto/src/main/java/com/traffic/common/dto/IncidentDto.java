package com.traffic.common.dto;

import com.traffic.common.model.IncidentSeverity;
import com.traffic.common.model.IncidentStatus;
import com.traffic.common.model.IncidentType;

import java.time.Instant;
import java.util.Objects;

/**
 * Data Transfer Object representing an immutable or updated traffic incident.
 */
public class IncidentDto {

    private String id;
    private String zoneId;
    private IncidentType type;
    private IncidentSeverity severity;
    private String description;
    private Instant timestamp;
    private IncidentStatus status;

    public IncidentDto() {
    }

    public IncidentDto(String id, String zoneId, IncidentType type, IncidentSeverity severity,
                       String description, Instant timestamp, IncidentStatus status) {
        this.id = id;
        this.zoneId = zoneId;
        this.type = type;
        this.severity = severity;
        this.description = description;
        this.timestamp = timestamp;
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

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public IncidentStatus getStatus() {
        return status;
    }

    public void setStatus(IncidentStatus status) {
        this.status = status;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        IncidentDto that = (IncidentDto) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "IncidentDto{" +
                "id='" + id + '\'' +
                ", zoneId='" + zoneId + '\'' +
                ", type=" + type +
                ", severity=" + severity +
                ", description='" + description + '\'' +
                ", timestamp=" + timestamp +
                ", status=" + status +
                '}';
    }
}
