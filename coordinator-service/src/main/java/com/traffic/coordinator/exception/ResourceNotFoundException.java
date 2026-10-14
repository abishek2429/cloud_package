package com.traffic.coordinator.exception;

/**
 * Thrown when a zone node or resource cannot be resolved by coordinator.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
