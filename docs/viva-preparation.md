# College Viva Voce & Technical Defense Guide

This guide prepares students for oral project examinations, viva voce evaluations, and technical interviews regarding the **Distributed Traffic Incident Monitoring System**.

---

## Category 1: Architecture & Distributed Systems Theory

### Q1: What makes this a "distributed system" rather than a standard web application?
> **Answer**:
> In a monolithic application, all components share the same physical memory space, process identifier (PID), and call stack. 
> In this system:
> 1. Computation is physically partitioned across multiple independent JVM processes (`coordinator-service`, `zone-north`, `zone-central`, `zone-south`).
> 2. Components communicate exclusively by passing structured messages over a network (TCP/IP and HTTP REST) without shared memory.
> 3. Each component can fail independently without crashing the others (partial failure).
> 4. State is geographically partitioned, and aggregate state must be dynamically synthesized over the network at query time.

---

### Q2: How does this system relate to the CAP Theorem?
> **Answer**:
> The CAP Theorem states that a distributed data store can simultaneously provide at most two out of three guarantees: **Consistency (C)**, **Availability (A)**, and **Partition Tolerance (P)**.
> - **Partition Tolerance (P)** is mandatory because network partitions (drops, timeouts, severed links) are inevitable in distributed networks.
> - When a network partition occurs (e.g., `zone-south` is disconnected), this system chooses **Availability (A) with Graceful Degradation** at the Coordinator level: it returns partial reports from available partitions (`NORTH`, `CENTRAL`) with a `200 OK` rather than failing the entire request.
> - Within each individual partition, **Consistency (C)** is preserved through ACID transactions in PostgreSQL.

---

### Q3: What is the difference between a transient failure and an outage?
> **Answer**:
> - **Transient Failure**: A short-lived, temporary anomaly (e.g., a momentary network packet drop, a 500ms Java Garbage Collection pause, or temporary socket backlog) that resolves itself almost immediately without human intervention.
> - **Outage**: A persistent, sustained failure state (e.g., an unhandled `OutOfMemoryError` crashing a JVM, a stopped Docker container, or a severed physical fiber cable) that requires a restart, recovery protocol, or administrative action to resolve.

---

### Q4: What is "flapping" and how does Hysteresis prevent it?
> **Answer**:
> - **Flapping**: The rapid oscillation of a node's reported status between `ONLINE` and `OFFLINE` caused by intermittent network jitter or periodic GC pauses. Flapping overwhelms monitoring systems, triggers alert storms, and causes unstable routing.
> - **Hysteresis**: A control-theory technique where a system's state depends on its history rather than instantaneous input. In our system, the coordinator requires **2 consecutive failed health probes** before transitioning a node to `OFFLINE`. Conversely, it requires **2 consecutive successful probes** before declaring the node restored to `ONLINE`. A single isolated glitch is absorbed without flipping state.

---

### Q5: Why must retries in a distributed system always be bounded?
> **Answer**:
> If retries are infinite, an unreachable downstream node causes calling services to retain connections, worker threads, and socket buffers indefinitely. As incoming traffic continues, the caller exhausts its thread pool (e.g., Tomcat's default 200 threads) and memory, causing **cascading failure** where healthy upstream services collapse under their own retry backlog. 
> Our system enforces **Bounded Retries** (maximum 3 attempts) with **Exponential Backoff** (200ms &rarr; 400ms &rarr; 800ms) to give the downstream service breathing room while guaranteeing thread termination.

---

## Category 2: Data Persistence, ACID & Idempotency

### Q6: How does this system achieve idempotency during incident creation?
> **Answer**:
> In distributed networks, a client might send an incident creation request, the server might successfully write it to the database, but the network acknowledgment might drop before reaching the client (the "Two Generals Problem"). If the client or coordinator retries, a duplicate record could be created.
> - **Our Solution**: Every incident is assigned a deterministic ID (`INC-<ZONE>-<sequence>-<UUID>`) *before* the first network transmission.
> - On receiving the request, the zone node executes `findById(id)`. If the record already exists, it recognizes the idempotency key, skips the database `INSERT`, and returns `200 OK` with the existing entity. Additionally, PostgreSQL enforces a `PRIMARY KEY` constraint on `id`, preventing duplicate rows at the storage engine level.

---

### Q7: Why did you choose PostgreSQL over in-memory storage (e.g., `ConcurrentHashMap`)?
> **Answer**:
> In-memory storage is volatile; when a container crashes or is stopped (`docker compose stop zone-south`), all stored incidents in JVM heap memory are permanently lost. When the container restarts, it starts empty, failing the core distributed systems requirement of **Durable Recovery**.
> PostgreSQL writes transactions to a **Write-Ahead Log (WAL)** persisted on a Docker named volume (`traffic-incident-db-data`). When a container restarts, it re-queries PostgreSQL, detects the persisted incident records, preserves them, and skips demo re-seeding.

---

### Q8: What database schema constraints were implemented and why?
> **Answer**:
> 1. `PRIMARY KEY (id)` on table `incidents`: Ensures cluster-wide uniqueness and guarantees write idempotency.
> 2. `PRIMARY KEY (zone_id)` on table `zones`: Uniquely identifies each territorial partition.
> 3. `FOREIGN KEY (zone_id) REFERENCES zones(zone_id)`: Enforces relational referential integrity, ensuring incidents cannot be filed for non-existent districts.
> 4. `INDEX idx_incidents_zone_time ON incidents(zone_id, timestamp DESC)`: A compound B-tree index optimizing partition-scoped queries ordered chronologically for city reports.

---

## Category 3: Implementation, Concurrency & Networking

### Q9: How does the Scatter-Gather aggregation pattern work in `coordinator-service`?
> **Answer**:
> The coordinator uses Java 17 `CompletableFuture.supplyAsync()` to query all configured zone endpoints (`/api/incidents`) concurrently.
> - **Sequential Approach**: $T_{\text{total}} = T_1 + T_2 + T_3 \approx 150\text{ms}$.
> - **Scatter-Gather (Concurrent)**: $T_{\text{total}} = \max(T_1, T_2, T_3) \approx 50\text{ms}$.
> Each future attaches an `.exceptionally()` fallback that intercepts `ResourceAccessException` (timeouts or connection refused), records the offline node in `unavailableZones`, and logs the error, allowing healthy partitions to be aggregated without blocking.

---

### Q10: How do Docker containers communicate without hardcoded IP addresses?
> **Answer**:
> All containers are attached to a custom bridge network (`traffic-network`). Docker runs an embedded DNS server at `127.0.0.11` that automatically resolves container names (`zone-north`, `zone-central`, `zone-south`, `traffic-db`, `coordinator-service`) to their dynamic container IP addresses. Service URLs are injected as environment variables (e.g., `ZONE_NORTH_URL=http://zone-north:8081`).

---

### Q11: How was CORS handled between the React Dashboard and the backend?
> **Answer**:
> 1. **Vite Reverse Proxy**: The Vite development server (`vite.config.js`) proxies all `/api/*` requests directly to the coordinator container (`http://172.31.170.134:8080`), so the browser treats the API as same-origin (`http://localhost:5173/api/...`), completely eliminating CORS browser pre-flight checks.
> 2. **Spring WebMvc Configuration**: Both `coordinator-service` and `zone-node` include a `WebConfig.java` bean implementing `WebMvcConfigurer` with `allowedOriginPatterns("*")` and standard HTTP verbs (`GET`, `POST`, `PATCH`, `OPTIONS`), ensuring direct API client access is also permitted.

---

## Category 4: Honest Engineering Limitations & Future Work

### Q12: What is the biggest single point of failure (SPOF) in your current architecture?
> **Answer**:
> The single PostgreSQL container (`traffic-db`). Although the application tier is distributed across three zone instances and a coordinator, they all share a single PostgreSQL database instance. If `traffic-db` crashes, all zone nodes lose persistence capability. In an enterprise production deployment, each zone node would own an isolated database (**Database-per-Service pattern**), or the database tier would be a distributed multi-master cluster (e.g., CockroachDB or Amazon Aurora Global Database).

---

### Q13: If a client's network connection drops before reaching the coordinator, can duplicate incidents still occur?
> **Answer**:
> Yes, if the client did not supply its own deterministic `id`. In our current implementation, if the client sends a request without an `id`, the coordinator assigns one *after* receiving the request. If the initial HTTP request drops before reaching the coordinator, the client might re-send the request, and the coordinator would generate a new ID. To solve this in production, clients must generate an `Idempotency-Key` UUID in the HTTP header before making the initial call.
