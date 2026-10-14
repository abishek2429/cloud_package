package com.traffic.common.dto;

import com.traffic.common.model.SystemStatus;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * City-wide aggregated traffic incident report compiled by the coordinator.
 */
public class CityReportDto {

    private int totalIncidents;
    private int activeIncidents;
    private int investigatingIncidents;
    private int resolvedIncidents;

    private int highSeverityCount;
    private int mediumSeverityCount;
    private int lowSeverityCount;

    private int totalConfiguredZones;
    private List<String> respondingZones = new ArrayList<>();
    private List<String> unavailableZones = new ArrayList<>();

    private SystemStatus systemStatus;
    private Instant generatedAt;
    private List<IncidentDto> incidents = new ArrayList<>();

    /**
     * Clear per-node diagnostic status and telemetry.
     */
    private List<NodeStatusDto> nodeStatuses = new ArrayList<>();

    /**
     * Per-node error messages for unavailable/failing zones.
     */
    private Map<String, String> nodeErrors = new HashMap<>();

    public CityReportDto() {
    }

    public int getTotalIncidents() {
        return totalIncidents;
    }

    public void setTotalIncidents(int totalIncidents) {
        this.totalIncidents = totalIncidents;
    }

    public int getActiveIncidents() {
        return activeIncidents;
    }

    public void setActiveIncidents(int activeIncidents) {
        this.activeIncidents = activeIncidents;
    }

    public int getInvestigatingIncidents() {
        return investigatingIncidents;
    }

    public void setInvestigatingIncidents(int investigatingIncidents) {
        this.investigatingIncidents = investigatingIncidents;
    }

    public int getResolvedIncidents() {
        return resolvedIncidents;
    }

    public void setResolvedIncidents(int resolvedIncidents) {
        this.resolvedIncidents = resolvedIncidents;
    }

    public int getHighSeverityCount() {
        return highSeverityCount;
    }

    public void setHighSeverityCount(int highSeverityCount) {
        this.highSeverityCount = highSeverityCount;
    }

    public int getMediumSeverityCount() {
        return mediumSeverityCount;
    }

    public void setMediumSeverityCount(int mediumSeverityCount) {
        this.mediumSeverityCount = mediumSeverityCount;
    }

    public int getLowSeverityCount() {
        return lowSeverityCount;
    }

    public void setLowSeverityCount(int lowSeverityCount) {
        this.lowSeverityCount = lowSeverityCount;
    }

    public int getTotalConfiguredZones() {
        return totalConfiguredZones;
    }

    public void setTotalConfiguredZones(int totalConfiguredZones) {
        this.totalConfiguredZones = totalConfiguredZones;
    }

    public List<String> getRespondingZones() {
        return respondingZones;
    }

    public void setRespondingZones(List<String> respondingZones) {
        this.respondingZones = respondingZones;
    }

    public List<String> getUnavailableZones() {
        return unavailableZones;
    }

    public void setUnavailableZones(List<String> unavailableZones) {
        this.unavailableZones = unavailableZones;
    }

    public SystemStatus getSystemStatus() {
        return systemStatus;
    }

    public void setSystemStatus(SystemStatus systemStatus) {
        this.systemStatus = systemStatus;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(Instant generatedAt) {
        this.generatedAt = generatedAt;
    }

    public List<IncidentDto> getIncidents() {
        return incidents;
    }

    public void setIncidents(List<IncidentDto> incidents) {
        this.incidents = incidents;
    }

    public List<NodeStatusDto> getNodeStatuses() {
        return nodeStatuses;
    }

    public void setNodeStatuses(List<NodeStatusDto> nodeStatuses) {
        this.nodeStatuses = nodeStatuses;
    }

    public Map<String, String> getNodeErrors() {
        return nodeErrors;
    }

    public void setNodeErrors(Map<String, String> nodeErrors) {
        this.nodeErrors = nodeErrors;
    }
}
