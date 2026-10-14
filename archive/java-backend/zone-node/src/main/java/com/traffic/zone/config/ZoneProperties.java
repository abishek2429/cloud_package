package com.traffic.zone.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties defining the zone node's identity and metadata.
 */
@Component
@ConfigurationProperties(prefix = "zone")
public class ZoneProperties {

    /**
     * Unique identifier of this zone partition (e.g. NORTH, CENTRAL, SOUTH).
     */
    private String id = "NORTH";

    /**
     * Human-readable label for this zone partition.
     */
    private String name = "North Zone";

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
