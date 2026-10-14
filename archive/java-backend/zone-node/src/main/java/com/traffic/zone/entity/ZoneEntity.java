package com.traffic.zone.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * JPA entity representing the partitioned zone identity.
 */
@Entity
@Table(name = "zones")
public class ZoneEntity {

    @Id
    @Column(name = "zone_id", length = 32, nullable = false)
    private String zoneId;

    @Column(name = "zone_name", length = 128, nullable = false)
    private String zoneName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public ZoneEntity() {
    }

    public ZoneEntity(String zoneId, String zoneName) {
        this.zoneId = zoneId;
        this.zoneName = zoneName;
        this.createdAt = Instant.now();
    }

    public String getZoneId() {
        return zoneId;
    }

    public void setZoneId(String zoneId) {
        this.zoneId = zoneId;
    }

    public String getZoneName() {
        return zoneName;
    }

    public void setZoneName(String zoneName) {
        this.zoneName = zoneName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
