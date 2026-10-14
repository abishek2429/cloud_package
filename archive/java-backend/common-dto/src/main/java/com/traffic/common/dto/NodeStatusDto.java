package com.traffic.common.dto;

import com.traffic.common.model.NodeStatus;

/**
 * Diagnostic and connectivity status of an individual zone node as monitored by coordinator.
 */
public class NodeStatusDto {

    private String zoneId;
    private String zoneName;
    private String url;
    private NodeStatus status;
    private Long responseTimeMs;
    private Integer incidentCount;
    private String errorMessage;

    public NodeStatusDto() {
    }

    public NodeStatusDto(String zoneId, String zoneName, String url, NodeStatus status,
                         Long responseTimeMs, Integer incidentCount, String errorMessage) {
        this.zoneId = zoneId;
        this.zoneName = zoneName;
        this.url = url;
        this.status = status;
        this.responseTimeMs = responseTimeMs;
        this.incidentCount = incidentCount;
        this.errorMessage = errorMessage;
    }

    public static NodeStatusDto online(String zoneId, String zoneName, String url, long responseTimeMs, int incidentCount) {
        return new NodeStatusDto(zoneId, zoneName, url, NodeStatus.ONLINE, responseTimeMs, incidentCount, null);
    }

    public static NodeStatusDto offline(String zoneId, String zoneName, String url, long responseTimeMs, String errorMessage) {
        return new NodeStatusDto(zoneId, zoneName, url, NodeStatus.OFFLINE, responseTimeMs, 0, errorMessage);
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

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public NodeStatus getStatus() {
        return status;
    }

    public void setStatus(NodeStatus status) {
        this.status = status;
    }

    public Long getResponseTimeMs() {
        return responseTimeMs;
    }

    public void setResponseTimeMs(Long responseTimeMs) {
        this.responseTimeMs = responseTimeMs;
    }

    public Integer getIncidentCount() {
        return incidentCount;
    }

    public void setIncidentCount(Integer incidentCount) {
        this.incidentCount = incidentCount;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
