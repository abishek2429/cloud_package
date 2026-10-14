package com.traffic.coordinator;

import com.traffic.common.dto.ZoneHealthDto;
import com.traffic.common.model.NodeStatus;
import com.traffic.coordinator.client.ZoneClient;
import com.traffic.coordinator.config.CoordinatorProperties;
import com.traffic.coordinator.config.CoordinatorProperties.ZoneConfig;
import com.traffic.coordinator.service.NodeHealthMonitorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

class NodeHealthMonitorTest {

    private CoordinatorProperties properties;
    private ZoneClient zoneClient;
    private NodeHealthMonitorService monitorService;

    @BeforeEach
    void setUp() {
        properties = new CoordinatorProperties();
        properties.getHealthCheck().setFailureThreshold(2);
        properties.getHealthCheck().setSuccessThreshold(2);

        ZoneConfig southZone = new ZoneConfig("SOUTH", "South District", "http://localhost:8083");
        properties.setZones(List.of(southZone));

        zoneClient = mock(ZoneClient.class);
        monitorService = new NodeHealthMonitorService(properties, zoneClient);
        monitorService.initializeNodeStates();
    }

    @Test
    @DisplayName("Hysteresis: Single transient failure does not immediately flip status to OFFLINE; 2 consecutive failures do")
    void testTransientFailureAvoidanceAndOfflineTransition() {
        ZoneConfig zone = properties.getZones().get(0);

        // Initially node starts in ONLINE state
        assertEquals(NodeStatus.ONLINE, monitorService.getNodeStatus("SOUTH").getStatus());

        // Probe 1: Transient network failure
        when(zoneClient.fetchHealth(argThat(z -> "SOUTH".equals(z.getId()))))
                .thenThrow(new ResourceAccessException("Connection timed out"));

        monitorService.pollSingleNode(zone);

        // Crucial requirement: status must STILL be ONLINE to prevent flapping from a single transient blip!
        assertEquals(NodeStatus.ONLINE, monitorService.getNodeStatus("SOUTH").getStatus(),
                "A single transient failure must NOT mark the node OFFLINE (hysteresis)");
        assertEquals(1, monitorService.getNodeStates().get("SOUTH").getConsecutiveFailures());

        // Probe 2: Second consecutive failure (reaches failureThreshold = 2)
        monitorService.pollSingleNode(zone);

        // Now status transitions to OFFLINE
        assertEquals(NodeStatus.OFFLINE, monitorService.getNodeStatus("SOUTH").getStatus(),
                "Node must transition to OFFLINE after reaching the failure threshold (2 consecutive failures)");
        assertEquals(2, monitorService.getNodeStates().get("SOUTH").getConsecutiveFailures());
    }

    @Test
    @DisplayName("Recovery: Node requires 2 consecutive successes to transition back to ONLINE")
    void testRecoveryThresholdTransition() {
        ZoneConfig zone = properties.getZones().get(0);

        // Drive node to OFFLINE first
        when(zoneClient.fetchHealth(any()))
                .thenThrow(new ResourceAccessException("Connection refused"));

        monitorService.pollSingleNode(zone);
        monitorService.pollSingleNode(zone);
        assertEquals(NodeStatus.OFFLINE, monitorService.getNodeStatus("SOUTH").getStatus());

        // Node recovers and starts responding: reset mock to clear exception
        reset(zoneClient);
        when(zoneClient.fetchHealth(any()))
                .thenReturn(new ZoneHealthDto("SOUTH", "South District", "UP", Instant.now(), 4, 120));

        // Recovery probe 1: Success 1 of 2
        monitorService.pollSingleNode(zone);
        assertEquals(NodeStatus.OFFLINE, monitorService.getNodeStatus("SOUTH").getStatus(),
                "Node must remain OFFLINE until success threshold is satisfied (1/2 successes)");

        // Recovery probe 2: Success 2 of 2 (satisfies threshold)
        monitorService.pollSingleNode(zone);
        assertEquals(NodeStatus.ONLINE, monitorService.getNodeStatus("SOUTH").getStatus(),
                "Node must transition back to ONLINE after reaching success threshold (2 consecutive successes)");
    }
}
