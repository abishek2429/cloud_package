# Comprehensive Test Cases & Verification Report

## 1. Overview & Verification Strategy

This document provides the formal test case specifications and empirical verification records for the **Distributed Traffic Incident Monitoring System**. 

The verification strategy follows a two-tier approach:
1. **Automated Unit & Integration Tests (17/17 Passed)**: Executed automatically in CI/CD and locally via Maven Wrapper (`.\mvnw.cmd test`), testing service logic, HTTP mocking, concurrency, bounded retries, hysteresis, and database idempotency.
2. **End-to-End Live Fault-Tolerance Tests (Empirically Executed)**: Real tests conducted against the live 5-container Docker cluster and React dashboard, validating container crash behavior, durable recovery, and UI telemetry.
3. **Items Requiring Manual Testing**: Real-world edge scenarios that require physical hardware intervention or extended soak runs are explicitly documented.

---

## 2. Automated Test Suite Specification (17/17 Passed)

| Test ID | Module | Test Class / Method | Objective | Status |
|---|---|---|---|---|
| `TC-AUT-01` | `coordinator-service` | `CoordinatorControllerTest.testAggregateCityReport_AllNodesOnline` | Verify scatter-gather aggregation returns combined incidents when all 3 zones are healthy. | **PASSED** |
| `TC-AUT-02` | `coordinator-service` | `CoordinatorControllerTest.testAggregateCityReport_OneNodeOffline_GracefulDegradation` | Verify coordinator returns partial results and `PARTIALLY_DEGRADED` status when 1 node fails. | **PASSED** |
| `TC-AUT-03` | `coordinator-service` | `CoordinatorControllerTest.testAggregateCityReport_AllNodesOffline` | Verify coordinator returns empty list with `ALL_NODES_DOWN` when all zone nodes fail. | **PASSED** |
| `TC-AUT-04` | `coordinator-service` | `CoordinatorControllerTest.testRouteIncident_Success` | Verify successful incident routing to target zone node with HTTP 201 Created. | **PASSED** |
| `TC-AUT-05` | `coordinator-service` | `CoordinatorControllerTest.testRouteIncident_ZoneNodeOffline_503` | Verify HTTP 503 Service Unavailable is returned when target zone node is unreachable. | **PASSED** |
| `TC-AUT-06` | `coordinator-service` | `CoordinatorControllerTest.testRouteIncident_ValidationFailure_400` | Verify HTTP 400 Bad Request with field validation errors when invalid payload is sent. | **PASSED** |
| `TC-AUT-07` | `coordinator-service` | `CoordinatorControllerTest.testFetchZoneIncidents_Success` | Verify querying incidents for a specific zone via coordinator returns HTTP 200. | **PASSED** |
| `TC-AUT-08` | `coordinator-service` | `CoordinatorControllerTest.testFetchZoneIncidents_ZoneOffline_503` | Verify HTTP 503 when querying incidents for an offline zone node. | **PASSED** |
| `TC-AUT-09` | `coordinator-service` | `CoordinatorControllerTest.testFetchZoneHealth_Success` | Verify querying health of a specific zone returns node health DTO. | **PASSED** |
| `TC-AUT-10` | `coordinator-service` | `CoordinatorControllerTest.testFetchZoneHealth_ZoneOffline_503` | Verify HTTP 503 when querying health of an offline zone node. | **PASSED** |
| `TC-AUT-11` | `coordinator-service` | `CoordinatorControllerTest.testCoordinatorHealth` | Verify coordinator service health probe returns status UP. | **PASSED** |
| `TC-AUT-12` | `coordinator-service` | `BoundedRetryExecutorTest.testRetrySucceedsOnSecondAttempt` | Verify retry executor recovers from initial transient failure with backoff. | **PASSED** |
| `TC-AUT-13` | `coordinator-service` | `BoundedRetryExecutorTest.testBoundedRetryExhausted` | Verify retry executor aborts after 3 bounded attempts and never retries indefinitely. | **PASSED** |
| `TC-AUT-14` | `coordinator-service` | `NodeHealthMonitorTest.testHysteresisPreventsFlappingOnSingleFailure` | Verify 1 failed probe keeps node ONLINE; 2 consecutive failures transition to OFFLINE. | **PASSED** |
| `TC-AUT-15` | `coordinator-service` | `NodeHealthMonitorTest.testRecoveryRequiresConsecutiveSuccesses` | Verify 1 successful probe keeps node OFFLINE; 2 consecutive successes restore ONLINE. | **PASSED** |
| `TC-AUT-16` | `zone-node` | `DuplicateIncidentSubmissionTest.testDuplicateIncidentId_IsIdempotent` | Verify duplicate incident IDs return existing record (200 OK) without creating duplicate DB rows. | **PASSED** |
| `TC-AUT-17` | `zone-node` | `DurableRecoveryTest.testDurableRecovery_PreservesExistingIncidents` | Verify service restart detects existing persisted rows in database and skips re-seeding. | **PASSED** |

### Execution Command:
```powershell
.\mvnw.cmd test
```
**Actual Result**: Total tests run: 17, Failures: 0, Errors: 0, Skipped: 0. Time elapsed: 6.776 s. BUILD SUCCESS.

---

## 3. End-to-End Live Integration Test Cases

### TC-E2E-01: Multi-Container Cluster Initialization & Health
- **Objective**: Verify that Docker Compose launches all 5 services with healthy status.
- **Preconditions**: Docker engine running; host ports 8080–8083 and 5432 available.
- **Execution Steps**:
  1. Execute `docker compose up -d` in project root.
  2. Execute `docker compose ps` to inspect container readiness.
- **Expected Result**: 5 containers (`traffic-db`, `zone-north`, `zone-central`, `zone-south`, `coordinator-service`) enter `healthy` state.
- **Actual Result (Executed)**:
  ```text
  NAME                  STATUS                   PORTS
  coordinator-service   Up 13 minutes (healthy)  0.0.0.0:8080->8080/tcp
  zone-north            Up 13 minutes (healthy)  0.0.0.0:8081->8081/tcp
  zone-central          Up 13 minutes (healthy)  0.0.0.0:8082->8082/tcp
  zone-south            Up 13 minutes (healthy)  0.0.0.0:8083->8083/tcp
  traffic-db            Up 13 minutes (healthy)  0.0.0.0:5432->5432/tcp
  ```
- **Status**: **PASSED**

---

### TC-E2E-02: Idempotent Incident Submission & Database Uniqueness
- **Objective**: Verify that submitting an incident with the same ID twice does not create duplicate database rows.
- **Preconditions**: All containers healthy; database accessible.
- **Execution Steps**:
  1. POST incident payload with ID `INC-SOUTH-DURABLE-999` to `http://localhost:8080/api/coordinator/incidents`.
  2. POST the exact same payload a second time to simulate a client/network retry.
  3. Query PostgreSQL via `docker exec traffic-db psql -U traffic_admin -d traffic_monitoring -c "SELECT zone_id, id FROM incidents WHERE id = 'INC-SOUTH-DURABLE-999';"`.
- **Expected Result**:
  - Request 1 returns `201 Created`.
  - Request 2 returns `200 OK` (Duplicate detected, returning existing record).
  - Database contains exactly 1 row for `INC-SOUTH-DURABLE-999`.
- **Actual Result (Executed)**:
  - Request 1 returned: `id: INC-SOUTH-DURABLE-999, status: ACTIVE (201 Created)`.
  - Request 2 returned: `id: INC-SOUTH-DURABLE-999, status: ACTIVE (200 OK)`.
  - PostgreSQL returned: `(1 row)` for `INC-SOUTH-DURABLE-999`.
- **Status**: **PASSED**

---

### TC-E2E-03: Partial Failure & Graceful Degradation
- **Objective**: Verify that terminating a zone node results in graceful degradation without coordinator crash.
- **Preconditions**: Cluster running normally with 3 online zones.
- **Execution Steps**:
  1. Stop `zone-south` container: `docker compose stop zone-south`.
  2. Query coordinator node telemetry: `GET http://localhost:8080/api/coordinator/nodes`.
  3. Query aggregated city report: `GET http://localhost:8080/api/coordinator/city-report`.
- **Expected Result**:
  - Coordinator responds with HTTP 200 OK.
  - `systemStatus` equals `"PARTIALLY_DEGRADED"`.
  - `respondingZones` contains `["NORTH", "CENTRAL"]`.
  - `unavailableZones` contains `["SOUTH"]`.
  - `nodeErrors.SOUTH` contains connection failure description.
  - Incidents from North and Central continue to be returned.
- **Actual Result (Executed)**:
  - HTTP 200 returned.
  - `systemStatus`: `"PARTIALLY_DEGRADED"`.
  - `unavailableZones`: `["SOUTH"]`.
  - `nodeErrors.SOUTH`: `"I/O error on GET request for \"http://zone-south:8083/api/incidents\": zone-south"`.
  - 5 incidents returned from North and Central without interruption.
- **Status**: **PASSED**

---

### TC-E2E-04: Durable Recovery After Container Restart
- **Objective**: Verify that restarting a stopped container restores cluster health and preserves previously stored dynamic incidents.
- **Preconditions**: `zone-south` is stopped with persistent incident `INC-SOUTH-DURABLE-999` saved.
- **Execution Steps**:
  1. Start container: `docker compose start zone-south`.
  2. Inspect container logs: `docker compose logs --tail=20 zone-south`.
  3. Query coordinator aggregated report: `GET http://localhost:8080/api/coordinator/city-report`.
- **Expected Result**:
  - `zone-south` starts and logs `DURABLE RECOVERY: Found 2 existing persisted incidents... Preserving data`.
  - Coordinator transitions South back to `ONLINE` after hysteresis threshold.
  - `systemStatus` returns to `"HEALTHY"`.
  - `INC-SOUTH-DURABLE-999` is returned in the city-wide report.
- **Actual Result (Executed)**:
  - Container started; startup log confirmed: `DURABLE RECOVERY: Found 2 existing persisted incidents for zone [SOUTH] in PostgreSQL. Preserving data and skipping demo seeding.`.
  - Aggregated city report returned `systemStatus: HEALTHY`, `unavailableZones: []`, and `INC-SOUTH-DURABLE-999` intact.
- **Status**: **PASSED**

---

### TC-E2E-05: React Operations Dashboard & Real-Time Wire Telemetry
- **Objective**: Verify frontend compiles without error and renders live cluster telemetry.
- **Preconditions**: Node.js 18+ installed; backend running.
- **Execution Steps**:
  1. Build production bundle: `cd dashboard && npm run build`.
  2. Start dev server: `npm run dev`.
  3. Query Vite dev proxy: `GET http://localhost:5173/api/coordinator/city-report`.
- **Expected Result**:
  - Build completes in < 500ms with zero errors.
  - Vite dev server serves HTTP 200 on port 5173.
  - Reverse proxy successfully returns live backend JSON.
- **Actual Result (Executed)**:
  - Build finished in 135ms (`dist/index.html`, CSS, and JS chunks generated).
  - Dev server running on `http://localhost:5173/`.
  - Proxy query returned `totalIncidents: 7`, 3 healthy nodes, and live latencies.
- **Status**: **PASSED**

---

## 4. Test Scenarios Requiring Manual Testing

To maintain strict academic integrity, the following scenarios could not be executed autonomously within this containerized environment and are flagged for manual testing during college project defense:

| Scenario ID | Test Description | Required Test Environment / Equipment | Reason for Manual Testing |
|---|---|---|---|
| `TC-MAN-01` | **Extended Soak / Memory Leak Run (24+ Hours)** | Standalone host server running continuous 3s polling over 24 hours. | Automated test runs are time-bounded; long-term JVM garbage collection and PostgreSQL connection pool stability over days requires dedicated soak infrastructure. |
| `TC-MAN-02` | **High-Concurrency Load Testing (10,000 req/sec)** | Apache JMeter / k6 distributed load generator cluster. | Local container environment shares host CPU/disk; generating 10k req/sec would throttle container CPU allocations and introduce artificial client bottlenecks. |
| `TC-MAN-03` | **Physical Network Cable Disconnection** | Physical server rack or Wi-Fi router with manual interface disable. | Docker virtual bridge network operations (`docker stop`) simulate process death and TCP RST/refused packets; simulating physical carrier-drop (silent packet drop without TCP RST) requires physical NIC unbinding. |
| `TC-MAN-04` | **Cross-Browser Safari & Mobile Viewport Audit** | Physical Apple iOS device / Safari browser. | Testing environment is Windows/Linux headless; native WebKit rendering engine quirks must be manually verified on actual Apple hardware. |
