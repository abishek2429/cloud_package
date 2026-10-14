package com.traffic.coordinator.exception;

/**
 * Thrown when an operation is requested on a zone node that is unreachable,
 * offline, or failing to respond within configured timeouts.
 */
public class ZoneUnavailableException extends RuntimeException {

    private final String zoneId;

    public ZoneUnavailableException(String zoneId, String message) {
        super(message);
        this.zoneId = zoneId;
    }

    public ZoneUnavailableException(String zoneId, String message, Throwable cause) {
        super(message, cause);
        this.zoneId = zoneId;
    }

    public String getZoneId() {
        return zoneId;
    }
}
