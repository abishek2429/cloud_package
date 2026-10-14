package com.traffic.common.dto;

import com.traffic.common.model.IncidentStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Payload for updating an incident's life-cycle status.
 */
public class UpdateIncidentStatusRequest {

    @NotNull(message = "New incident status is required (ACTIVE, INVESTIGATING, RESOLVED)")
    private IncidentStatus status;

    public UpdateIncidentStatusRequest() {
    }

    public UpdateIncidentStatusRequest(IncidentStatus status) {
        this.status = status;
    }

    public IncidentStatus getStatus() {
        return status;
    }

    public void setStatus(IncidentStatus status) {
        this.status = status;
    }
}
