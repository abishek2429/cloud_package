package com.traffic.zone.entity;

import com.traffic.common.model.IncidentSeverity;
import com.traffic.common.model.IncidentStatus;
import com.traffic.common.model.IncidentType;
import jakarta.persistence.*;

import java.time.Instant;

/**
 * JPA entity representing a durable traffic incident record.
 * Uses primary key uniqueness on 'id' for deduplication and idempotency.
 */
@Entity
@Table(name = "incidents", indexes = {
        @Index(name = "idx_incidents_zone_time", columnList = "zone_id, timestamp DESC")
})
public class IncidentEntity {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "zone_id", length = 32, nullable = false)
    private String zoneId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 32, nullable = false)
    private IncidentType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", length = 32, nullable = false)
    private IncidentSeverity severity;

    @Column(name = "description", length = 500, nullable = false)
    private String description;

    @Column(name = "timestamp", nullable = false)
    private Instant timestamp;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 32, nullable = false)
    private IncidentStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public IncidentEntity() {
    }

    public IncidentEntity(String id, String zoneId, IncidentType type, IncidentSeverity severity,
                          String description, Instant timestamp, IncidentStatus status) {
        this.id = id;
        this.zoneId = zoneId;
        this.type = type;
        this.severity = severity;
        this.description = description;
        this.timestamp = timestamp != null ? timestamp : Instant.now();
        this.status = status != null ? status : IncidentStatus.ACTIVE;
        this.createdAt = Instant.now();
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
