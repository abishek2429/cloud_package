import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { healthMonitor } from './healthMonitor.js';
import * as aggregator from './aggregator.js';

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

/**
 * Health check for coordinator itself
 * GET /api/coordinator/health and /coordinator/health
 */
const handleHealth = (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  res.json({
    status: 'UP',
    service: 'coordinator-service',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    configuredZones: config.zones.map((z) => z.id),
  });
};
app.get('/api/coordinator/health', handleHealth);
app.get('/coordinator/health', handleHealth);

/**
 * Aggregated city report across all zones
 * GET /api/coordinator/city-report and /coordinator/city-report
 */
const handleCityReport = async (req, res) => {
  try {
    const report = await aggregator.aggregateCityReport();
    res.json(report);
  } catch (err) {
    console.error('[Coordinator] City report aggregation failed:', err);
    res.status(500).json({ error: 'Failed to aggregate city report', details: err.message });
  }
};
app.get('/api/coordinator/city-report', handleCityReport);
app.get('/coordinator/city-report', handleCityReport);

/**
 * Diagnostic node statuses via health monitor hysteresis
 * GET /api/coordinator/nodes and /coordinator/nodes
 */
const handleNodes = async (req, res) => {
  try {
    const statuses = healthMonitor.getAllNodeStatuses();
    res.json(statuses);
  } catch (err) {
    console.error('[Coordinator] Failed to retrieve node statuses:', err);
    res.status(500).json({ error: 'Failed to retrieve node statuses', details: err.message });
  }
};
app.get('/api/coordinator/nodes', handleNodes);
app.get('/coordinator/nodes', handleNodes);

/**
 * Fetch incidents for a specific zone
 * GET /api/coordinator/zones/:zoneId/incidents
 */
app.get('/api/coordinator/zones/:zoneId/incidents', async (req, res) => {
  try {
    const incidents = await aggregator.getIncidentsForZone(req.params.zoneId);
    res.json(incidents);
  } catch (err) {
    console.error(`[Coordinator] Failed to fetch incidents for zone ${req.params.zoneId}:`, err.message);
    res.status(503).json({ error: err.message, zoneId: req.params.zoneId });
  }
});

/**
 * Fetch health for a specific zone
 * GET /api/coordinator/zones/:zoneId/health
 */
app.get('/api/coordinator/zones/:zoneId/health', async (req, res) => {
  try {
    const health = await aggregator.getHealthForZone(req.params.zoneId);
    res.json(health);
  } catch (err) {
    console.error(`[Coordinator] Failed to fetch health for zone ${req.params.zoneId}:`, err.message);
    res.status(503).json({ error: err.message, zoneId: req.params.zoneId });
  }
});

/**
 * Submit incident through coordinator (auto-routed with retries)
 * POST /api/coordinator/incidents and /coordinator/incidents
 */
const handleIncidentCreation = async (req, res) => {
  try {
    const zoneId = req.body.hospitalId || req.body.zoneId;
    const type = req.body.conditionType || req.body.type;
    const severity = req.body.triageLevel || req.body.severity;
    const description = req.body.description;
    const status = req.body.status || 'ACTIVE';

    const normalizedBody = {
      ...req.body,
      zoneId,
      type,
      severity,
      description,
      status,
    };

    const validationErrors = {};
    if (!zoneId) {
      validationErrors.zoneId = 'Hospital / Zone ID is required (e.g., NORTH, CENTRAL, SOUTH)';
    }
    if (!type) {
      validationErrors.type = 'Emergency condition type is required';
    }
    if (!severity) {
      validationErrors.severity = 'Triage severity is required (HIGH/RED, MEDIUM/YELLOW, LOW/GREEN)';
    }
    if (!description || description.trim().length < 5 || description.trim().length > 500) {
      validationErrors.description = 'Description must be between 5 and 500 characters';
    }

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        validationErrors,
        timestamp: new Date().toISOString(),
      });
    }

    const outcome = await aggregator.routeIncidentCreation(normalizedBody);
    res.status(outcome.statusCode).json(outcome.data);
  } catch (err) {
    console.error('[Coordinator] Emergency dispatch routing failed:', err.message);
    const statusCode = err.status || 503;
    res.status(statusCode).json({
      error: 'Target hospital facility unavailable',
      details: err.message,
      timestamp: new Date().toISOString(),
    });
  }
};
app.post('/api/coordinator/incidents', handleIncidentCreation);
app.post('/coordinator/incidents', handleIncidentCreation);
app.post('/api/coordinator/emergencies', handleIncidentCreation);
app.post('/coordinator/emergencies', handleIncidentCreation);
app.get('/api/coordinator/hospitals', handleNodes);
app.get('/coordinator/hospitals', handleNodes);

/**
 * Proxy PATCH status updates to individual zones
 * PATCH /api/incidents/:id/status
 */
app.patch('/api/incidents/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const requestedStatus = req.query.status || req.body?.status;

    // Search which zone has this incident, or query all zones
    let updated = null;
    for (const zone of config.zones) {
      try {
        const patchRes = await fetch(`${zone.url}/api/incidents/${id}/status?status=${encodeURIComponent(requestedStatus)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(config.http.readTimeoutMs),
        });
        if (patchRes.ok) {
          updated = await patchRes.json();
          break;
        }
      } catch {
        // Continue searching other zones
      }
    }

    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: `Incident not found with ID '${id}' across any online zone` });
    }
  } catch (err) {
    res.status(500).json({ error: 'Status update failed', details: err.message });
  }
});

// Start Server and Health Monitoring
async function start() {
  try {
    console.log(`================================================================`);
    console.log(`Starting Coordinator Service on port ${config.port}...`);
    console.log(`================================================================`);

    // 1. Start background health monitor with hysteresis
    healthMonitor.start();

    // 2. Start HTTP server
    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`[Coordinator] Listening on port ${config.port} (0.0.0.0)`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n[Coordinator] Received ${signal}. Shutting down gracefully...`);
      healthMonitor.stop();
      server.close(() => {
        console.log('[Coordinator] Closed HTTP server.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[Coordinator] Fatal startup error:', err);
    process.exit(1);
  }
}

// Only auto-start when run directly
if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app };
