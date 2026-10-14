package com.traffic.common.dto;

import java.time.Instant;

/**
 * Health and telemetry payload returned by an individual zone node.
 */
public class ZoneHealthDto {

    private String zoneId;
    private String zoneName;
    private String status;
    private Instant timestamp;
    private int incidentCount;
    private long uptimeSeconds;

    public ZoneHealthDto() {
    }

    public ZoneHealthDto(String zoneId, String zoneName, String status, Instant timestamp,
                         int incidentCount, long uptimeSeconds) {
        this.zoneId = zoneId;
        this.zoneName = zoneName;
        this.status = status;
        this.timestamp = timestamp;
        this.incidentCount = incidentCount;
        this.uptimeSeconds = uptimeSeconds;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public int getIncidentCount() {
        return incidentCount;
    }

    public void setIncidentCount(int incidentCount) {
        this.incidentCount = incidentCount;
    }

    public long getUptimeSeconds() {
        return uptimeSeconds;
    }

    public void setUptimeSeconds(long uptimeSeconds) {
        this.uptimeSeconds = uptimeSeconds;
    }
}
