package com.traffic.zone;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.traffic.common.dto.CreateIncidentRequest;
import com.traffic.common.dto.UpdateIncidentStatusRequest;
import com.traffic.common.model.IncidentSeverity;
import com.traffic.common.model.IncidentStatus;
import com.traffic.common.model.IncidentType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ZoneIncidentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testGetHealth() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")))
                .andExpect(jsonPath("$.zoneId", is("NORTH")))
                .andExpect(jsonPath("$.incidentCount", greaterThanOrEqualTo(0)));
    }

    @Test
    void testGetAllIncidents() throws Exception {
        mockMvc.perform(get("/api/incidents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)));
    }

    @Test
    void testCreateIncidentAndRetrieve() throws Exception {
        CreateIncidentRequest request = new CreateIncidentRequest();
        request.setType(IncidentType.ACCIDENT);
        request.setSeverity(IncidentSeverity.HIGH);
        request.setDescription("Severe rollover on highway junction 5");
        request.setStatus(IncidentStatus.ACTIVE);

        String responseContent = mockMvc.perform(post("/api/incidents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.zoneId", is("NORTH")))
                .andExpect(jsonPath("$.type", is("ACCIDENT")))
                .andExpect(jsonPath("$.severity", is("HIGH")))
                .andExpect(jsonPath("$.description", is("Severe rollover on highway junction 5")))
                .andExpect(jsonPath("$.status", is("ACTIVE")))
                .andReturn().getResponse().getContentAsString();

        String incidentId = objectMapper.readTree(responseContent).get("id").asText();

        // Retrieve by ID
        mockMvc.perform(get("/api/incidents/" + incidentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(incidentId)));

        // Update status
        UpdateIncidentStatusRequest statusReq = new UpdateIncidentStatusRequest(IncidentStatus.RESOLVED);
        mockMvc.perform(patch("/api/incidents/" + incidentId + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("RESOLVED")));
    }

    @Test
    void testCreateIncidentValidationFailure() throws Exception {
        // Missing type, severity, and blank description
        CreateIncidentRequest invalidRequest = new CreateIncidentRequest();
        invalidRequest.setDescription("");

        mockMvc.perform(post("/api/incidents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.description", notNullValue()))
                .andExpect(jsonPath("$.fieldErrors.type", notNullValue()))
                .andExpect(jsonPath("$.fieldErrors.severity", notNullValue()));
    }

    @Test
    void testGetNonExistentIncidentReturns404() throws Exception {
        mockMvc.perform(get("/api/incidents/INC-NONEXISTENT-999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")));
    }
}
