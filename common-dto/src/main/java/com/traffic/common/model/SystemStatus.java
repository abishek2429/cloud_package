package com.traffic.common.model;

/**
 * Overall city-wide traffic monitoring system status based on zone node availability.
 */
public enum SystemStatus {
    HEALTHY,            // All configured zone nodes are responding
    PARTIALLY_DEGRADED, // At least one zone node is offline, but some are responding
    CRITICAL            // All zone nodes are offline
}
