# ==============================================================================
# Multi-stage Production Dockerfile for Central Coordinator Service
# ==============================================================================

# Stage 1: Build source using Maven and Temurin JDK 17
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /workspace

# Copy parent POM and sub-module POMs for efficient layer caching
COPY pom.xml .
COPY common-dto/pom.xml common-dto/
COPY zone-node/pom.xml zone-node/
COPY coordinator-service/pom.xml coordinator-service/pom.xml

# Copy sources for common-dto and coordinator-service
COPY common-dto/src common-dto/src
COPY coordinator-service/src coordinator-service/src

# Compile and package the coordinator-service JAR
RUN mvn clean package -DskipTests -pl coordinator-service -am

# Stage 2: Minimal, secure JRE 17 runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Run as non-root user for container security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy the built artifact from builder stage
COPY --from=builder /workspace/coordinator-service/target/coordinator-service-*.jar app.jar

# Expose coordinator default port
EXPOSE 8080

# Production container JVM flags:
# -XX:+UseContainerSupport: respects cgroup memory & CPU limits
# -XX:MaxRAMPercentage=75.0: allocates up to 75% container memory to JVM heap
# -Djava.security.egd=file:/dev/./urandom: fast non-blocking entropy
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
