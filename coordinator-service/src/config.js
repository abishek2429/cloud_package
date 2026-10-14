/**
 * Configuration module for Coordinator Service
 */

export const config = {
  port: parseInt(process.env.SERVER_PORT || process.env.PORT || '8080', 10),
  zones: [
    {
      id: 'NORTH',
      name: 'North District',
      url: process.env.ZONE_NORTH_URL || 'http://zone-north:8081',
    },
    {
      id: 'CENTRAL',
      name: 'Central District',
      url: process.env.ZONE_CENTRAL_URL || 'http://zone-central:8082',
    },
    {
      id: 'SOUTH',
      name: 'South District',
      url: process.env.ZONE_SOUTH_URL || 'http://zone-south:8083',
    },
  ],
  http: {
    connectTimeoutMs: parseInt(process.env.HTTP_CONNECT_TIMEOUT_MS || '2000', 10),
    readTimeoutMs: parseInt(process.env.HTTP_READ_TIMEOUT_MS || '2500', 10),
  },
  healthCheck: {
    enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
    intervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '5000', 10),
    timeoutMs: parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS || '2000', 10),
    failureThreshold: parseInt(process.env.HEALTH_CHECK_FAILURE_THRESHOLD || '2', 10),
    successThreshold: parseInt(process.env.HEALTH_CHECK_SUCCESS_THRESHOLD || '2', 10),
  },
  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3', 10),
    initialBackoffMs: parseInt(process.env.RETRY_INITIAL_BACKOFF_MS || '200', 10),
    backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2.0'),
    maxBackoffMs: parseInt(process.env.RETRY_MAX_BACKOFF_MS || '1000', 10),
  },
};
