/**
 * Configuration module for Coordinator Service
 */

export const config = {
  port: parseInt(process.env.SERVER_PORT || process.env.PORT || '8080', 10),
  zones: [
    {
      id: 'NORTH',
      name: 'North Trauma Center',
      hospitalName: 'North Trauma Center',
      facilityType: 'Level 1 Emergency Trauma',
      totalIcuBeds: 45,
      url: process.env.ZONE_NORTH_URL || 'http://127.0.0.1:8081',
    },
    {
      id: 'CENTRAL',
      name: 'Central General Hospital',
      hospitalName: 'Central General Hospital',
      facilityType: 'University Acute Care',
      totalIcuBeds: 60,
      url: process.env.ZONE_CENTRAL_URL || 'http://127.0.0.1:8082',
    },
    {
      id: 'SOUTH',
      name: 'South Memorial Hospital',
      hospitalName: 'South Memorial Hospital',
      facilityType: 'Regional Surge & Burn Unit',
      totalIcuBeds: 40,
      url: process.env.ZONE_SOUTH_URL || 'http://127.0.0.1:8083',
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
