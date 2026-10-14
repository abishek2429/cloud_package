package com.traffic.coordinator.client;

import com.traffic.common.dto.CreateIncidentRequest;
import com.traffic.common.dto.IncidentDto;
import com.traffic.common.dto.ZoneHealthDto;
import com.traffic.coordinator.config.CoordinatorProperties.ZoneConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

/**
 * Modern Spring 3.2+ {@link RestClient} implementation of {@link ZoneClient}.
 */
@Component
public class HttpZoneClient implements ZoneClient {

    private static final Logger log = LoggerFactory.getLogger(HttpZoneClient.class);

    private final RestClient restClient;

    public HttpZoneClient(RestClient restClient) {
        this.restClient = restClient;
    }

    @Override
    public ZoneHealthDto fetchHealth(ZoneConfig zone) {
        String url = zone.getUrl() + "/api/health";
        log.debug("Polling zone health endpoint via RestClient: {}", url);
        return restClient.get()
                .uri(url)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(ZoneHealthDto.class);
    }

    @Override
    public List<IncidentDto> fetchIncidents(ZoneConfig zone) {
        String url = zone.getUrl() + "/api/incidents";
        log.debug("Fetching incidents from zone via RestClient: {}", url);
        return restClient.get()
                .uri(url)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(new ParameterizedTypeReference<List<IncidentDto>>() {});
    }

    @Override
    public IncidentDto createIncident(ZoneConfig zone, CreateIncidentRequest request) {
        String url = zone.getUrl() + "/api/incidents";
        log.info("Dispatching incident creation to {} via RestClient: {}", zone.getId(), url);
        return restClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(IncidentDto.class);
    }
}
