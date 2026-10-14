package com.traffic.zone.repository;

import com.traffic.zone.entity.ZoneEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for zone identity management.
 */
@Repository
public interface ZoneJpaRepository extends JpaRepository<ZoneEntity, String> {
}
