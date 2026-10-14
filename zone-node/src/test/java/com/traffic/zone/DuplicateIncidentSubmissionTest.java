package com.traffic.zone;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.traffic.common.dto.CreateIncidentRequest;
import com.traffic.common.dto.IncidentDto;
import com.traffic.common.model.IncidentSeverity;
import com.traffic.common.model.IncidentStatus;
import com.traffic.common.model.IncidentType;
import com.traffic.zone.repository.IncidentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class DuplicateIncidentSubmissionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private IncidentRepository repository;

    @Test
    @DisplayName("Submitting an incident with duplicate ID returns existing incident without creating duplicates")
    void testDuplicateIncidentSubmissionIsIdempotent() throws Exception {
        String customId = "INC-NORTH-IDEM-001";
        int initialCount = repository.countByZoneId("NORTH");

        CreateIncidentRequest firstRequest = new CreateIncidentRequest(
                customId,
                "NORTH",
                IncidentType.ACCIDENT,
                IncidentSeverity.HIGH,
                "Overturned oil tanker on North highway",
                IncidentStatus.ACTIVE
        );

        // First submission: should succeed and create record
        String firstResponse = mockMvc.perform(post("/api/incidents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(firstRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(customId)))
                .andExpect(jsonPath("$.description", is("Overturned oil tanker on North highway")))
                .andReturn().getResponse().getContentAsString();

        IncidentDto firstIncident = objectMapper.readValue(firstResponse, IncidentDto.class);
        assertEquals(customId, firstIncident.getId());
        assertEquals(initialCount + 1, repository.countByZoneId("NORTH"));

        // Second submission with exact same ID (simulating a network retry):
        CreateIncidentRequest duplicateRequest = new CreateIncidentRequest(
                customId,
                "NORTH",
                IncidentType.ACCIDENT,
                IncidentSeverity.HIGH,
                "Overturned oil tanker on North highway (Retry)",
                IncidentStatus.ACTIVE
        );

        mockMvc.perform(post("/api/incidents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(customId)))
                .andExpect(jsonPath("$.description", is("Overturned oil tanker on North highway"))); // unchanged

        // Verify count has NOT incremented - no duplicate record was created in database!
        assertEquals(initialCount + 1, repository.countByZoneId("NORTH"));
    }
}
