package com.traffic.zone;

import com.traffic.common.dto.CreateIncidentRequest;
import com.traffic.common.dto.IncidentDto;
import com.traffic.common.model.IncidentSeverity;
import com.traffic.common.model.IncidentStatus;
import com.traffic.common.model.IncidentType;
import com.traffic.zone.config.ZoneProperties;
import com.traffic.zone.repository.IncidentRepository;
import com.traffic.zone.service.ZoneIncidentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class DurableRecoveryTest {

    @Autowired
    private ZoneIncidentService incidentService;

    @Autowired
    private IncidentRepository repository;

    @Autowired
    private ZoneProperties zoneProperties;

    @Test
    @DisplayName("Durable recovery: Persisted incidents survive simulated container/service restarts")
    void testPersistedIncidentsSurviveSimulatedRestart() {
        // 1. Submit a runtime incident
        String runtimeId = "INC-RECOVER-TEST-001";
        CreateIncidentRequest runtimeRequest = new CreateIncidentRequest(
                runtimeId,
                "NORTH",
                IncidentType.ROAD_CLOSED,
                IncidentSeverity.HIGH,
                "Water main break on North Expressway (Runtime Incident)",
                IncidentStatus.ACTIVE
        );

        IncidentDto created = incidentService.createIncident(runtimeRequest);
        assertNotNull(created);
        assertEquals(runtimeId, created.getId());

        int countBeforeRestart = repository.countByZoneId("NORTH");
        assertTrue(countBeforeRestart >= 3); // 2 seeded demo + 1 newly added

        // 2. Simulate Node Restart:
        // In a container restart, a new ZoneIncidentService bean is initialized,
        // and its @PostConstruct method (seedInitialDemoIncidents) is invoked.
        ZoneIncidentService restartedService = new ZoneIncidentService(repository, zoneProperties);
        restartedService.seedInitialDemoIncidents();

        // 3. Confirm Recovery:
        // - The runtime incident still exists in durable storage
        IncidentDto recoveredIncident = restartedService.getIncidentById(runtimeId);
        assertNotNull(recoveredIncident, "Runtime incident must survive node restart!");
        assertEquals("Water main break on North Expressway (Runtime Incident)", recoveredIncident.getDescription());

        // - Total incident count has not been wiped or re-seeded over
        int countAfterRestart = repository.countByZoneId("NORTH");
        assertEquals(countBeforeRestart, countAfterRestart, "Persisted incident count must remain identical after restart");

        // - All incidents in the zone are retrieved successfully
        List<IncidentDto> allIncidents = restartedService.getAllIncidents(null, null);
        assertTrue(allIncidents.stream().anyMatch(i -> runtimeId.equals(i.getId())));
    }
}
