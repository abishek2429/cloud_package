package com.traffic.coordinator.client;

import com.traffic.common.dto.CreateIncidentRequest;
import com.traffic.common.dto.IncidentDto;
import com.traffic.common.dto.ZoneHealthDto;
import com.traffic.coordinator.config.CoordinatorProperties.ZoneConfig;

import java.util.List;

/**
 * Interface contract for communicating with downstream distributed zone nodes.
 */
public interface ZoneClient {

    /**
     * Polls the health endpoint of the specified zone node.
     */
    ZoneHealthDto fetchHealth(ZoneConfig zone);

    /**
     * Fetches all incidents stored in the specified zone node.
     */
    List<IncidentDto> fetchIncidents(ZoneConfig zone);

    /**
     * Dispatches an incident creation request to the specified zone node.
     */
    IncidentDto createIncident(ZoneConfig zone, CreateIncidentRequest request);
}
