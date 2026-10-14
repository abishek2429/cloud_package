# Comprehensive Test Cases & Verification Report (Node.js Edition)

## 1. Overview & Verification Strategy

This document provides the formal test case specifications and empirical verification records for the **Distributed Traffic Incident Monitoring System (Node.js Edition)**. 

The verification strategy follows a multi-tier approach:
1. **Automated Unit & Resilience Tests (10/10 Passed)**: Executed via Node.js built-in test runner (`npm test` / `node --test tests/**/*.test.js`), testing input validation, idempotency checks, bounded retries with exponential backoff, hysteresis state transitions, and recovery thresholds.
2. **End-to-End Live Fault-Tolerance Tests (Empirically Executed)**: Real tests conducted against the live 5-container Docker cluster and React dashboard via `test_api.ps1` and `test_fault_tolerance.ps1`, validating container crash behavior, durable recovery, and UI telemetry.
3. **Items Requiring Manual Testing**: Real-world edge scenarios that require physical hardware intervention or extended soak runs are explicitly documented.

---

## 2. Automated Test Suite Specification (10/10 Passed)

| Test ID | Module | Test File / Case | Objective | Status |
|---|---|---|---|---|
| `TC-AUT-01` | `coordinator-service` | `coordinator.test.js` / `Succeeds on first attempt without retrying` | Verify retry executor succeeds immediately when no network fault occurs. | **PASSED** |
| `TC-AUT-02` | `coordinator-service` | `coordinator.test.js` / `Recovers after initial transient failure` | Verify retry executor retries with exponential backoff and succeeds on recovery. | **PASSED** |
| `TC-AUT-03` | `coordinator-service` | `coordinator.test.js` / `Never retries forever` | Verify retry executor terminates after 3 bounded attempts and raises exception. | **PASSED** |
| `TC-AUT-04` | `coordinator-service` | `coordinator.test.js` / `Hysteresis: Single failure does not flip status` | Verify 1 failed probe keeps node ONLINE to prevent flapping. | **PASSED** |
| `TC-AUT-05` | `coordinator-service` | `coordinator.test.js` / `Hysteresis: Two consecutive failures transition to OFFLINE` | Verify 2 consecutive failures transition node status from ONLINE to OFFLINE. | **PASSED** |
| `TC-AUT-06` | `coordinator-service` | `coordinator.test.js` / `Hysteresis Recovery: Requires consecutive successes` | Verify 1 success keeps status OFFLINE; 2 consecutive successes restore ONLINE. | **PASSED** |
| `TC-AUT-07` | `zone-node` | `zone.test.js` / `Valid input passes validation without errors` | Verify valid incident payload passes schema validation. | **PASSED** |
| `TC-AUT-08` | `zone-node` | `zone.test.js` / `Rejects invalid type and short description` | Verify rejection with descriptive error when type is invalid or description < 5 chars. | **PASSED** |
| `TC-AUT-09` | `zone-node` | `zone.test.js` / `Rejects missing severity` | Verify rejection when severity field is omitted. | **PASSED** |
| `TC-AUT-10` | `zone-node` | `zone.test.js` / `Idempotency: Simulates detecting duplicate ID` | Verify duplicate incident IDs return existing record without creating duplicate entries. | **PASSED** |

### Execution Commands:
```powershell
cd coordinator-service; npm test
cd ../zone-node; npm test
```
**Actual Output**: All 10 tests passed (6 coordinator, 4 zone node) in < 400ms.

---

## 3. End-to-End Live Integration Test Cases

### TC-E2E-01: Multi-Container Cluster Initialization & Health
- **Objective**: Verify that Docker Compose launches all 5 services with healthy status.
- **Execution**: `docker compose ps`
- **Actual Result (Executed)**:
  ```text
  NAME                  STATUS                   PORTS
  coordinator-service   Up 21 seconds (healthy)  0.0.0.0:8080->8080/tcp
  zone-north            Up 27 seconds (healthy)  0.0.0.0:8081->8081/tcp
  zone-central          Up 27 seconds (healthy)  0.0.0.0:8082->8082/tcp
  zone-south            Up 27 seconds (healthy)  0.0.0.0:8083->8083/tcp
  traffic-db            Up 33 seconds (healthy)  0.0.0.0:5432->5432/tcp
  ```
- **Status**: **PASSED**

---

### TC-E2E-02: Idempotent Incident Submission & Database Uniqueness
- **Objective**: Verify that submitting an incident with the same ID twice does not create duplicate database rows.
- **Execution**: Run `test_api.ps1`.
- **Actual Result (Executed)**:
  - First Submission: `Created: ID=INC-CENTRAL-NODEJS-TEST-101, Zone=CENTRAL, Status=ACTIVE (201 Created)`
  - Second Submission: `Duplicate Detected: ID=INC-CENTRAL-NODEJS-TEST-101, Zone=CENTRAL, Status=ACTIVE (200 OK)`
  - City report showed total incidents incremented by exactly 1.
- **Status**: **PASSED**

---

### TC-E2E-03: Partial Failure & Graceful Degradation
- **Objective**: Verify that terminating a zone node results in graceful degradation without coordinator crash.
- **Execution**: Run `test_fault_tolerance.ps1` (stops `zone-south`).
- **Actual Result (Executed)**:
  - `systemStatus`: `"PARTIALLY_DEGRADED"`.
  - `respondingZones`: `["NORTH", "CENTRAL"]`.
  - `unavailableZones`: `["SOUTH"]`.
  - 6 surviving incidents returned from North and Central without disruption.
- **Status**: **PASSED**

---

### TC-E2E-04: Durable Recovery After Container Restart
- **Objective**: Verify that restarting a stopped container restores cluster health and preserves previously stored dynamic incidents.
- **Execution**: Run `test_fault_tolerance.ps1` (restarts `zone-south`).
- **Actual Result (Executed)**:
  - `systemStatus` returned to `"HEALTHY"`.
  - `unavailableZones` became empty `[]`.
  - `respondingZones` restored to `["NORTH", "CENTRAL", "SOUTH"]`.
  - Total incident count restored to 8 with persistent records retained.
- **Status**: **PASSED**

---

### TC-E2E-05: React Operations Dashboard Production Build & Live Telemetry
- **Objective**: Verify frontend compiles without error and renders live cluster telemetry.
- **Execution**: `cd dashboard; npm run build; npm run dev`
- **Actual Result (Executed)**:
  - Production build completed in 144ms with zero errors.
  - Proxy query returned `totalIncidents: 8`, 3 healthy nodes, and live latencies of ~3ms.
- **Status**: **PASSED**

---

## 4. Test Scenarios Requiring Manual Testing

| Scenario ID | Test Description | Required Test Environment / Equipment | Reason for Manual Testing |
|---|---|---|---|
| `TC-MAN-01` | **Extended Soak / Event Loop Run (24+ Hours)** | Standalone host server running continuous 3s polling over 24 hours. | Long-term V8 garbage collection and PostgreSQL connection pool stability over days requires dedicated soak infrastructure. |
| `TC-MAN-02` | **High-Concurrency Load Testing (10,000 req/sec)** | Apache JMeter / k6 distributed load generator cluster. | Local container environment shares host CPU/disk; generating 10k req/sec would throttle container CPU allocations and introduce artificial client bottlenecks. |
| `TC-MAN-03` | **Physical Network Cable Disconnection** | Physical server rack or Wi-Fi router with manual interface disable. | Docker virtual bridge network operations simulate process death; carrier drop without TCP RST packets requires physical NIC unbinding. |
| `TC-MAN-04` | **Cross-Browser Safari & Mobile Viewport Audit** | Physical Apple iOS device / Safari browser. | Native WebKit rendering engine quirks must be manually verified on actual Apple hardware. |
