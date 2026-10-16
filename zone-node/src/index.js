import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import * as db from './db.js';
import * as incidentService from './incidentService.js';

const app = express();
const startTime = Date.now();

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Allowed enum values
const VALID_TYPES = [
  'MASS_TRAUMA',
  'CARDIAC_ARREST',
  'RESPIRATORY_FAILURE',
  'SURGICAL_EMERGENCY',
  'BURN_CRITICAL',
  'STROKE_ALERT',
  'ACCIDENT',
  'TRAFFIC_JAM',
  'HAZARD',
  'ROAD_CLOSED',
];
const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'];
const VALID_STATUSES = ['ACTIVE', 'INVESTIGATING', 'RESOLVED'];

/**
 * Health telemetry endpoint
 * GET /api/health
 */
app.get('/api/health', async (req, res) => {
  try {
    const incidentCount = await incidentService.getIncidentCount();
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    res.json({
      status: 'UP',
      zoneId: config.zoneId,
      zoneName: config.zoneName,
      database: db.getDatabaseMetadata(),
      incidentCount,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Health] Health check query failed:', err.message);
    res.status(503).json({
      status: 'DOWN',
      zoneId: config.zoneId,
      errorMessage: err.message,
    });
  }
});

/**
 * List incidents for this zone
 * GET /api/incidents
 */
app.get('/api/incidents', async (req, res) => {
  try {
    const { severity, status } = req.query;
    const incidents = await incidentService.getIncidents({ severity, status });
    res.json(incidents);
  } catch (err) {
    console.error('[Incidents] Failed to list incidents:', err.message);
    res.status(500).json({ error: 'Failed to retrieve incidents', details: err.message });
  }
});

/**
 * Get incident by ID
 * GET /api/incidents/:id
 */
app.get('/api/incidents/:id', async (req, res) => {
  try {
    const incident = await incidentService.getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: `Incident not found with ID '${req.params.id}'` });
    }
    res.json(incident);
  } catch (err) {
    console.error(`[Incidents] Error retrieving incident ${req.params.id}:`, err.message);
    res.status(500).json({ error: 'Failed to retrieve incident', details: err.message });
  }
});

/**
 * Create incident (Idempotent)
 * POST /api/incidents
 */
app.post('/api/incidents', async (req, res) => {
  try {
    const { id, type, severity, description, status, timestamp } = req.body;

    // Validation
    const validationErrors = {};
    if (!type || !VALID_TYPES.includes(type.toUpperCase())) {
      validationErrors.type = `Incident type must be one of: ${VALID_TYPES.join(', ')}`;
    }
    if (!severity || !VALID_SEVERITIES.includes(severity.toUpperCase())) {
      validationErrors.severity = `Incident severity must be one of: ${VALID_SEVERITIES.join(', ')}`;
    }
    if (!description || description.trim().length < 5 || description.trim().length > 500) {
      validationErrors.description = 'Description must be between 5 and 500 characters';
    }
    if (status && !VALID_STATUSES.includes(status.toUpperCase())) {
      validationErrors.status = `Incident status must be one of: ${VALID_STATUSES.join(', ')}`;
    }

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        validationErrors,
        timestamp: new Date().toISOString(),
      });
    }

    const result = await incidentService.createIncident({
      id,
      type,
      severity,
      description: description.trim(),
      status: status ? status.toUpperCase() : 'ACTIVE',
      timestamp,
    });

    // If duplicate was detected, return 200 OK (Idempotency)
    // If newly created, return 201 Created
    const statusCode = result.isDuplicate ? 200 : 201;
    res.status(statusCode).json(result.incident);
  } catch (err) {
    console.error('[Incidents] Creation failed:', err.message);
    res.status(500).json({ error: 'Failed to process incident', details: err.message });
  }
});

/**
 * Update incident status
 * PATCH /api/incidents/:id/status
 */
app.patch('/api/incidents/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const requestedStatus = req.query.status || req.body?.status;

    if (!requestedStatus || !VALID_STATUSES.includes(requestedStatus.toUpperCase())) {
      return res.status(400).json({
        error: `Status parameter is required and must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const updated = await incidentService.updateStatus(id, requestedStatus);
    if (!updated) {
      return res.status(404).json({ error: `Incident not found with ID '${id}'` });
    }

    console.log(`[Zone: ${config.zoneId}] Updated incident [${id}] status to ${updated.status}`);
    res.json(updated);
  } catch (err) {
    console.error(`[Incidents] Status update failed for ${req.params.id}:`, err.message);
    res.status(500).json({ error: 'Failed to update status', details: err.message });
  }
});

// Start Server and Initialize Database
async function start() {
  try {
    console.log(`================================================================`);
    console.log(`Starting Zone Node [${config.zoneId}] on port ${config.port}...`);
    console.log(`================================================================`);

    // 1. Connect to PostgreSQL with retry (non-blocking in-memory fallback)
    try {
      await db.initializeDatabaseWithRetry();
    } catch (err) {
      console.warn(`[Zone: ${config.zoneId}] DB init notice: ${err.message}`);
    }

    // 2. Initialize zone records & durable recovery check
    try {
      await incidentService.initializeZone();
    } catch (err) {
      console.warn(`[Zone: ${config.zoneId}] Zone seed notice: ${err.message}`);
    }

    // 3. Start HTTP server
    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`[Zone: ${config.zoneId}] Listening on port ${config.port} (0.0.0.0)`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n[Zone: ${config.zoneId}] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        try {
          await db.pool.end();
        } catch {}
        console.log(`[Zone: ${config.zoneId}] Closed HTTP server and database pool.`);
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error(`[Zone: ${config.zoneId}] Startup error:`, err);
    // Start server anyway so coordinator health checks succeed
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`[Zone: ${config.zoneId}] Resilient fallback listening on port ${config.port} (0.0.0.0)`);
    });
  }
}

// Only auto-start when run directly
if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app };
