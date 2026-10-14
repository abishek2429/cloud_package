package com.traffic.zone.repository;

import com.traffic.common.model.IncidentSeverity;
import com.traffic.common.model.IncidentStatus;
import com.traffic.zone.entity.IncidentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for durable incident records with partition queries.
 */
@Repository
public interface IncidentJpaRepository extends JpaRepository<IncidentEntity, String> {

    List<IncidentEntity> findByZoneIdOrderByTimestampDesc(String zoneId);

    List<IncidentEntity> findByZoneIdAndSeverityOrderByTimestampDesc(String zoneId, IncidentSeverity severity);

    List<IncidentEntity> findByZoneIdAndStatusOrderByTimestampDesc(String zoneId, IncidentStatus status);

    int countByZoneId(String zoneId);

    Optional<IncidentEntity> findByIdAndZoneId(String id, String zoneId);
}
