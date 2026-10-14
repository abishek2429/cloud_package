package com.traffic.coordinator;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.traffic.common.dto.CreateIncidentRequest;
import com.traffic.common.dto.IncidentDto;
import com.traffic.common.dto.ZoneHealthDto;
import com.traffic.common.model.IncidentSeverity;
import com.traffic.common.model.IncidentStatus;
import com.traffic.common.model.IncidentType;
import com.traffic.coordinator.client.ZoneClient;
import com.traffic.coordinator.config.CoordinatorProperties.ZoneConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.ResourceAccessException;

import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CoordinatorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ZoneClient zoneClient;

    @Test
    void testGetCityReportWithGracefulDegradationWhenSouthFails() throws Exception {
        // Arrange: North and Central succeed; South throws network failure
        IncidentDto northIncident = new IncidentDto(
                "INC-NORTH-101", "NORTH", IncidentType.ACCIDENT, IncidentSeverity.HIGH,
                "North accident on expressway", Instant.now(), IncidentStatus.ACTIVE);

        IncidentDto centralIncident = new IncidentDto(
                "INC-CENTRAL-201", "CENTRAL", IncidentType.TRAFFIC_JAM, IncidentSeverity.MEDIUM,
                "Central congestion near plaza", Instant.now(), IncidentStatus.ACTIVE);

        when(zoneClient.fetchIncidents(argThat(z -> z != null && "NORTH".equalsIgnoreCase(z.getId()))))
                .thenReturn(List.of(northIncident));

        when(zoneClient.fetchIncidents(argThat(z -> z != null && "CENTRAL".equalsIgnoreCase(z.getId()))))
                .thenReturn(List.of(centralIncident));

        when(zoneClient.fetchIncidents(argThat(z -> z != null && "SOUTH".equalsIgnoreCase(z.getId()))))
                .thenThrow(new ResourceAccessException("I/O error on GET request: Connection refused: connect"));

        // Act & Assert: Coordinator returns partial results with 200 OK and clear per-node errors
        mockMvc.perform(get("/api/coordinator/city-report"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncidents", is(2)))
                .andExpect(jsonPath("$.activeIncidents", is(2)))
                .andExpect(jsonPath("$.highSeverityCount", is(1)))
                .andExpect(jsonPath("$.mediumSeverityCount", is(1)))
                .andExpect(jsonPath("$.systemStatus", is("PARTIALLY_DEGRADED")))
                .andExpect(jsonPath("$.respondingZones", containsInAnyOrder("NORTH", "CENTRAL")))
                .andExpect(jsonPath("$.unavailableZones", contains("SOUTH")))
                .andExpect(jsonPath("$.nodeErrors.SOUTH", containsString("Connection refused")))
                .andExpect(jsonPath("$.nodeStatuses", hasSize(3)))
                .andExpect(jsonPath("$.nodeStatuses[?(@.zoneId=='SOUTH')].status", contains("OFFLINE")))
                .andExpect(jsonPath("$.incidents", hasSize(2)));
    }

    @Test
    void testAggregationWhenAllNodesHealthy() throws Exception {
        IncidentDto north = new IncidentDto("INC-N-1", "NORTH", IncidentType.ACCIDENT, IncidentSeverity.LOW, "North", Instant.now(), IncidentStatus.ACTIVE);
        IncidentDto central = new IncidentDto("INC-C-1", "CENTRAL", IncidentType.TRAFFIC_JAM, IncidentSeverity.MEDIUM, "Central", Instant.now(), IncidentStatus.ACTIVE);
        IncidentDto south = new IncidentDto("INC-S-1", "SOUTH", IncidentType.ROAD_CLOSED, IncidentSeverity.HIGH, "South", Instant.now(), IncidentStatus.ACTIVE);

        when(zoneClient.fetchIncidents(argThat(z -> z != null && "NORTH".equalsIgnoreCase(z.getId())))).thenReturn(List.of(north));
        when(zoneClient.fetchIncidents(argThat(z -> z != null && "CENTRAL".equalsIgnoreCase(z.getId())))).thenReturn(List.of(central));
        when(zoneClient.fetchIncidents(argThat(z -> z != null && "SOUTH".equalsIgnoreCase(z.getId())))).thenReturn(List.of(south));

        mockMvc.perform(get("/api/coordinator/city-report"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncidents", is(3)))
                .andExpect(jsonPath("$.systemStatus", is("HEALTHY")))
                .andExpect(jsonPath("$.respondingZones", hasSize(3)))
                .andExpect(jsonPath("$.unavailableZones", hasSize(0)));
    }

    @Test
    void testAggregationWhenAllNodesDownReturnsCritical() throws Exception {
        when(zoneClient.fetchIncidents(any())).thenThrow(new ResourceAccessException("Connection timed out"));

        mockMvc.perform(get("/api/coordinator/city-report"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncidents", is(0)))
                .andExpect(jsonPath("$.systemStatus", is("CRITICAL")))
                .andExpect(jsonPath("$.respondingZones", hasSize(0)))
                .andExpect(jsonPath("$.unavailableZones", hasSize(3)));
    }

    @Test
    void testGetNodeStatusesReflectsOnlineAndOfflineNodes() throws Exception {
        when(zoneClient.fetchHealth(argThat(z -> z != null && "NORTH".equalsIgnoreCase(z.getId()))))
                .thenReturn(new ZoneHealthDto("NORTH", "North District", "UP", Instant.now(), 5, 100));

        when(zoneClient.fetchHealth(argThat(z -> z != null && "CENTRAL".equalsIgnoreCase(z.getId()))))
                .thenReturn(new ZoneHealthDto("CENTRAL", "Central District", "UP", Instant.now(), 3, 100));

        when(zoneClient.fetchHealth(argThat(z -> z != null && "SOUTH".equalsIgnoreCase(z.getId()))))
                .thenThrow(new ResourceAccessException("Connection timed out"));

        mockMvc.perform(get("/api/coordinator/nodes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[?(@.zoneId=='NORTH')].status", contains("ONLINE")))
                .andExpect(jsonPath("$[?(@.zoneId=='CENTRAL')].status", contains("ONLINE")))
                .andExpect(jsonPath("$[?(@.zoneId=='SOUTH')].status", contains("OFFLINE")))
                .andExpect(jsonPath("$[?(@.zoneId=='SOUTH')].errorMessage", notNullValue()));
    }

    @Test
    void testRouteIncidentCreationSuccess() throws Exception {
        CreateIncidentRequest request = new CreateIncidentRequest(
                "NORTH", IncidentType.ROAD_CLOSED, IncidentSeverity.HIGH,
                "Bridge closure due to flooding", IncidentStatus.ACTIVE);

        IncidentDto created = new IncidentDto(
                "INC-NORTH-105-ABCD", "NORTH", IncidentType.ROAD_CLOSED, IncidentSeverity.HIGH,
                "Bridge closure due to flooding", Instant.now(), IncidentStatus.ACTIVE);

        when(zoneClient.createIncident(any(ZoneConfig.class), any(CreateIncidentRequest.class)))
                .thenReturn(created);

        mockMvc.perform(post("/api/coordinator/incidents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is("INC-NORTH-105-ABCD")))
                .andExpect(jsonPath("$.zoneId", is("NORTH")));
    }

    @Test
    void testRouteIncidentCreationValidationFailureReturns400() throws Exception {
        // Missing description and null severity
        CreateIncidentRequest invalid = new CreateIncidentRequest();
        invalid.setZoneId("NORTH");
        invalid.setType(IncidentType.ACCIDENT);
        invalid.setDescription(""); // blank description

        mockMvc.perform(post("/api/coordinator/incidents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.description", notNullValue()))
                .andExpect(jsonPath("$.fieldErrors.severity", notNullValue()));
    }

    @Test
    void testRouteIncidentCreationToInvalidZoneReturns400() throws Exception {
        CreateIncidentRequest request = new CreateIncidentRequest(
                "EAST", IncidentType.ACCIDENT, IncidentSeverity.LOW,
                "Minor fender bender", IncidentStatus.ACTIVE);

        mockMvc.perform(post("/api/coordinator/incidents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", containsString("Unknown target zone 'EAST'")));
    }

    @Test
    void testRouteIncidentWhenTargetZoneUnavailableReturns503() throws Exception {
        CreateIncidentRequest request = new CreateIncidentRequest(
                "SOUTH", IncidentType.ACCIDENT, IncidentSeverity.HIGH,
                "South expressway accident", IncidentStatus.ACTIVE);

        when(zoneClient.createIncident(any(ZoneConfig.class), any(CreateIncidentRequest.class)))
                .thenThrow(new ResourceAccessException("Connection refused: getsockopt"));

        mockMvc.perform(post("/api/coordinator/incidents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status", is(503)))
                .andExpect(jsonPath("$.error", is("Service Unavailable")))
                .andExpect(jsonPath("$.message", containsString("Failed to route incident to zone 'SOUTH'")));
    }

    @Test
    void testGetZoneIncidentsViaCoordinatorSuccess() throws Exception {
        IncidentDto inc = new IncidentDto("INC-N-50", "NORTH", IncidentType.TRAFFIC_JAM, IncidentSeverity.LOW, "Traffic", Instant.now(), IncidentStatus.ACTIVE);
        when(zoneClient.fetchIncidents(argThat(z -> z != null && "NORTH".equalsIgnoreCase(z.getId()))))
                .thenReturn(List.of(inc));

        mockMvc.perform(get("/api/coordinator/zones/NORTH/incidents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is("INC-N-50")));
    }

    @Test
    void testGetZoneIncidentsWhenZoneOfflineReturns503() throws Exception {
        when(zoneClient.fetchIncidents(argThat(z -> z != null && "SOUTH".equalsIgnoreCase(z.getId()))))
                .thenThrow(new ResourceAccessException("Connection refused"));

        mockMvc.perform(get("/api/coordinator/zones/SOUTH/incidents"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status", is(503)))
                .andExpect(jsonPath("$.message", containsString("Failed to fetch incidents from zone 'SOUTH'")));
    }

    @Test
    void testCoordinatorHealth() throws Exception {
        mockMvc.perform(get("/api/coordinator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")))
                .andExpect(jsonPath("$.service", is("coordinator-service")));
    }
}
