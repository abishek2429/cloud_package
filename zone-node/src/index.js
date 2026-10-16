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

/**
 * Interactive Autonomous Hospital Partition Console (Port 8081 / 8082 / 8083)
 */
app.get('/', (req, res) => {
  const dbMeta = db.getDatabaseMetadata();
  const totalBeds = config.zoneId === 'NORTH' ? 45 : (config.zoneId === 'CENTRAL' ? 60 : 40);

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.zoneName} — Hospital Partition Console</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --accent-cyan: #0284c7;
      --online: #16a34a;
      --online-bg: #dcfce7;
      --danger: #dc2626;
      --danger-bg: #fee2e2;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text-main); line-height: 1.5; padding: 1.5rem; }
    .container { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
    .nav-bar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; background: var(--card-bg); padding: 0.85rem 1.25rem; border-radius: 12px; border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .nav-links { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .nav-btn { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.775rem; font-weight: 600; text-decoration: none; border: 1px solid var(--border); color: var(--text-main); background: #f1f5f9; transition: all 0.15s; }
    .nav-btn:hover { background: #e2e8f0; }
    .nav-btn.active { background: var(--accent-cyan); color: white; border-color: var(--accent-cyan); }
    .nav-btn.central { background: #0f172a; color: white; border-color: #0f172a; }
    .hero-card { background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border); padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .hero-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem; }
    .badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.65rem; border-radius: 9999px; font-size: 0.725rem; font-weight: 700; background: var(--online-bg); color: var(--online); border: 1px solid #86efac; }
    .db-pill { font-family: monospace; font-size: 0.75rem; font-weight: 700; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 0.25rem 0.6rem; border-radius: 6px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-box { background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; padding: 1rem; }
    .stat-label { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.03em; }
    .stat-val { font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin-top: 0.25rem; }
    .stat-val.green { color: var(--online); }
    .grid-2 { display: grid; grid-template-columns: 320px 1fr; gap: 1.25rem; }
    @media (max-width: 860px) { .grid-2 { grid-template-columns: 1fr; } }
    .panel { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .panel-title { font-size: 1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .form-group { margin-bottom: 0.85rem; }
    .form-group label { display: block; font-size: 0.775rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.3rem; }
    .form-control { width: 100%; padding: 0.55rem 0.75rem; font-size: 0.825rem; border: 1px solid var(--border); border-radius: 6px; background: #ffffff; color: var(--text-main); font-family: inherit; }
    .form-control:focus { outline: none; border-color: var(--accent-cyan); ring: 2px rgba(2,132,199,0.2); }
    .btn-submit { width: 100%; padding: 0.65rem 1rem; background: var(--accent-cyan); color: white; border: none; border-radius: 6px; font-weight: 700; font-size: 0.825rem; cursor: pointer; transition: background 0.15s; }
    .btn-submit:hover { background: #0369a1; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th { text-align: left; padding: 0.65rem 0.75rem; font-size: 0.725rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); background: #f8fafc; }
    td { padding: 0.75rem; border-bottom: 1px solid var(--border); }
    .severity-pill { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.675rem; font-weight: 700; }
    .severity-HIGH { background: var(--danger-bg); color: var(--danger); border: 1px solid #fca5a5; }
    .severity-MEDIUM { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .severity-LOW { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .btn-action { padding: 0.25rem 0.5rem; font-size: 0.7rem; font-weight: 600; border-radius: 4px; border: 1px solid var(--border); background: #ffffff; cursor: pointer; }
    .btn-action:hover { background: #f1f5f9; }
    .btn-action.resolve { color: var(--online); border-color: #86efac; }
    .autonomy-banner { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.85rem 1rem; font-size: 0.775rem; color: #166534; display: flex; align-items: center; gap: 0.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="nav-bar">
      <div>
        <strong style="font-size:0.95rem; color:var(--text-main);">PulseGrid Multi-Node Healthcare Mesh</strong>
        <span style="font-size:0.775rem; color:var(--text-muted); margin-left:0.5rem;">Autonomous Partition Console</span>
      </div>
      <div class="nav-links">
        <a href="http://localhost:5173" class="nav-btn central">🌐 Central Dispatch (5173)</a>
        <a href="http://localhost:8081" class="nav-btn ${config.zoneId === 'NORTH' ? 'active' : ''}">🏥 North Trauma (8081)</a>
        <a href="http://localhost:8082" class="nav-btn ${config.zoneId === 'CENTRAL' ? 'active' : ''}">🏥 Central General (8082)</a>
        <a href="http://localhost:8083" class="nav-btn ${config.zoneId === 'SOUTH' ? 'active' : ''}">🏥 South Memorial (8083)</a>
      </div>
    </div>

    <div class="hero-card">
      <div class="hero-header">
        <div>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
            <span class="badge">🟢 AUTONOMOUS PARTITION ONLINE</span>
            <span class="db-pill">🗄️ ${dbMeta.databaseName}</span>
          </div>
          <h1 style="font-size:1.5rem; font-weight:800; color:var(--text-main);">${config.zoneName}</h1>
          <p style="font-size:0.85rem; color:var(--text-muted);">
            Dedicated Node Port: <strong>${config.port}</strong> • Zone ID: <strong>${config.zoneId}</strong> • Facility Type: <strong>${config.zoneId === 'NORTH' ? 'Level 1 Trauma Facility' : (config.zoneId === 'CENTRAL' ? 'University Teaching Hospital' : 'Regional Burn & Acute Unit')}</strong>
          </p>
        </div>

        <div style="text-align:right; font-size:0.75rem; color:var(--text-muted); font-family:monospace;">
          <div>Storage: <strong>${dbMeta.storageEngine}</strong></div>
          <div>Ledger File: <code>${dbMeta.dbFile}</code></div>
          <div style="color:var(--online); font-weight:bold; margin-top:0.2rem;">Shared-Nothing Isolation</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-label">Total ICU Beds</div>
          <div class="stat-val">${totalBeds}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Available ICU Beds</div>
          <div class="stat-val green" id="stat-available-beds">--</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Admitted Patients</div>
          <div class="stat-val" id="stat-admitted">--</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Partition Uptime</div>
          <div class="stat-val" id="stat-uptime" style="font-size:1.25rem;">--</div>
        </div>
      </div>

      <div class="autonomy-banner">
        <span>🛡️</span>
        <div>
          <strong>Shared-Nothing Autonomous Partition Guarantee:</strong> This hospital node operates directly against its private ledger (<code>${dbMeta.dbFile}</code>). It can independently admit patients, record vitals, and update triage statuses without communicating with other nodes.
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title">
          <span>➕</span>
          <span>Admit Emergency Patient</span>
        </div>
        <form id="admit-form">
          <div class="form-group">
            <label>Emergency Condition</label>
            <select id="form-type" class="form-control" required>
              <option value="MASS_TRAUMA">Mass Trauma / Collision</option>
              <option value="CARDIAC_ARREST">Cardiac Arrest / STEMI</option>
              <option value="RESPIRATORY_FAILURE">Respiratory Failure</option>
              <option value="SURGICAL_EMERGENCY">Acute Surgical Emergency</option>
              <option value="BURN_CRITICAL">Critical Burn / Inhalation</option>
              <option value="STROKE_ALERT">Acute Stroke Alert</option>
            </select>
          </div>

          <div class="form-group">
            <label>Triage Severity</label>
            <select id="form-severity" class="form-control" required>
              <option value="HIGH">High (Immediate Resuscitation)</option>
              <option value="MEDIUM">Medium (Urgent Trauma)</option>
              <option value="LOW">Low (Semi-Urgent)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Clinical Description / Vitals</label>
            <textarea id="form-desc" class="form-control" rows="3" placeholder="Enter patient triage notes..." required minlength="5">Trauma intake via local ambulance: GCS 13, stabilized in Resus Bay</textarea>
          </div>

          <button type="submit" class="btn-submit" id="btn-submit-patient">
            Admit Patient Directly to Node ${config.zoneId}
          </button>
        </form>
      </div>

      <div class="panel">
        <div class="panel-title" style="justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span>📋</span>
            <span>Local Patient Ledger (<span id="patient-count">0</span>)</span>
          </div>
          <button onclick="loadData()" class="btn-action">🔄 Refresh</button>
        </div>

        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Condition</th>
                <th>Severity</th>
                <th>Admitted</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="incidents-tbody">
              <tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Loading patient admissions...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    const TOTAL_BEDS = ${totalBeds};

    async function loadData() {
      try {
        const [healthRes, incRes] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/incidents')
        ]);
        const health = await healthRes.json();
        const incidents = await incRes.json();

        // Update stats
        const activeCount = incidents.filter(i => i.status !== 'RESOLVED').length;
        document.getElementById('stat-available-beds').innerText = Math.max(0, TOTAL_BEDS - activeCount) + ' beds';
        document.getElementById('stat-admitted').innerText = incidents.length + ' cases';
        document.getElementById('stat-uptime').innerText = (health.uptimeSeconds || 0) + 's';
        document.getElementById('patient-count').innerText = incidents.length;

        // Render table
        const tbody = document.getElementById('incidents-tbody');
        if (!incidents || incidents.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:2rem;">No active patient records in local database.</td></tr>';
          return;
        }

        tbody.innerHTML = incidents.map(inc => {
          const isResolved = inc.status === 'RESOLVED';
          const timeStr = new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return \`
            <tr>
              <td style="font-family:monospace; font-weight:700; color:var(--accent-cyan);">\${inc.id}</td>
              <td style="font-weight:600;">\${inc.type.replace(/_/g, ' ')}</td>
              <td><span class="severity-pill severity-\${inc.severity}">\${inc.severity}</span></td>
              <td style="font-size:0.75rem; color:var(--text-muted);">\${timeStr}</td>
              <td>
                <span style="font-size:0.725rem; font-weight:700; color:\${isResolved ? 'var(--text-muted)' : 'var(--online)'}">
                  \${inc.status}
                </span>
              </td>
              <td>
                \${isResolved 
                  ? '<span style="font-size:0.7rem; color:var(--text-muted);">Discharged</span>'
                  : \`<button onclick="updateStatus('\${inc.id}', 'RESOLVED')" class="btn-action resolve">Discharge / Resolve</button>\`
                }
              </td>
            </tr>
          \`;
        }).join('');
      } catch (err) {
        console.error('Failed to load local data', err);
      }
    }

    async function updateStatus(id, newStatus) {
      try {
        const res = await fetch('/api/incidents/' + encodeURIComponent(id) + '/status?status=' + newStatus, {
          method: 'PATCH'
        });
        if (res.ok) {
          loadData();
        } else {
          alert('Failed to update status');
        }
      } catch (e) {
        alert('Network error updating status');
      }
    }

    document.getElementById('admit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = document.getElementById('form-type').value;
      const severity = document.getElementById('form-severity').value;
      const description = document.getElementById('form-desc').value;
      const btn = document.getElementById('btn-submit-patient');

      btn.disabled = true;
      btn.innerText = 'Admitting...';

      try {
        const res = await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, severity, description })
        });
        if (res.ok) {
          loadData();
          document.getElementById('form-desc').value = 'Emergency patient intake: Vitals stable, triage completed.';
        } else {
          const errData = await res.json();
          alert('Admission error: ' + (errData.error || 'Server error'));
        }
      } catch (err) {
        alert('Network failure admitting patient');
      } finally {
        btn.disabled = false;
        btn.innerText = 'Admit Patient Directly to Node ${config.zoneId}';
      }
    });

    loadData();
    setInterval(loadData, 3000);
  </script>
</body>
</html>`);
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
