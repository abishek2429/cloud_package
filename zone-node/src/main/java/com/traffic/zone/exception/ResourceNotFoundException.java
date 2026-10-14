package com.traffic.zone.exception;

/**
 * Thrown when an incident report cannot be found in the current zone's repository.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
