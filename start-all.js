/**
 * Production Cluster Runner for Railway / Cloud Deployments
 *
 * Concurrently spawns the three autonomous Zone Nodes (Ports 8081, 8082, 8083)
 * and the central Coordinator Service (Port 8080 or Railway's assigned $PORT).
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const port = process.env.PORT || '8080';
const dbUrl = process.env.DATABASE_URL || process.env.SPRING_DATASOURCE_URL;

console.log('================================================================');
console.log('🏥 Starting PulseGrid - Distributed Emergency Medical & Trauma Network');
console.log(`📡 Dispatch Coordinator Port: ${port}`);
console.log(`🗄️ Database: ${dbUrl ? 'Configured (DATABASE_URL detected)' : 'Local Default'}`);
console.log('================================================================');

const children = [];
let isShuttingDown = false;

function startProcess(name, scriptRelativePath, envVars = {}) {
  const fullPath = path.join(__dirname, scriptRelativePath);
  const child = spawn(process.execPath, [fullPath], {
    env: {
      ...process.env,
      ...envVars,
    },
    stdio: 'inherit',
    cwd: path.dirname(fullPath),
  });

  child.on('error', (err) => {
    console.error(`❌ [${name}] Process error:`, err);
  });

  child.on('exit', (code, signal) => {
    console.log(`⚠️ [${name}] Process exited (Code: ${code}, Signal: ${signal})`);
    if (!isShuttingDown) {
      console.log(`🔄 [Supervisor] Automatically respawning [${name}] in 2000ms...`);
      setTimeout(() => {
        if (!isShuttingDown) {
          startProcess(name, scriptRelativePath, envVars);
        }
      }, 2000);
    }
  });

  children.push({ name, process: child });
  return child;
}

// 1. Spawn Autonomous Hospital 1: North Trauma Center (8081) - Database: pulsegrid_north
startProcess('North-Trauma', path.join('zone-node', 'src', 'index.js'), {
  SERVER_PORT: '8081',
  PORT: '8081',
  ZONE_ID: 'NORTH',
  ZONE_NAME: 'North Trauma Center',
  DB_NAME: 'pulsegrid_north',
  ...(dbUrl ? { DATABASE_URL: dbUrl } : {}),
});

// 2. Spawn Autonomous Hospital 2: Central General Hospital (8082) - Database: pulsegrid_central
startProcess('Central-General', path.join('zone-node', 'src', 'index.js'), {
  SERVER_PORT: '8082',
  PORT: '8082',
  ZONE_ID: 'CENTRAL',
  ZONE_NAME: 'Central General Hospital',
  DB_NAME: 'pulsegrid_central',
  ...(dbUrl ? { DATABASE_URL: dbUrl } : {}),
});

// 3. Spawn Autonomous Hospital 3: South Memorial Hospital (8083) - Database: pulsegrid_south
startProcess('South-Memorial', path.join('zone-node', 'src', 'index.js'), {
  SERVER_PORT: '8083',
  PORT: '8083',
  ZONE_ID: 'SOUTH',
  ZONE_NAME: 'South Memorial Hospital',
  DB_NAME: 'pulsegrid_south',
  ...(dbUrl ? { DATABASE_URL: dbUrl } : {}),
});

// 4. Wait 2 seconds for zone nodes to initialize DB connections, then start Coordinator Service
setTimeout(() => {
  startProcess('Coordinator', path.join('coordinator-service', 'src', 'index.js'), {
    PORT: port,
    SERVER_PORT: port,
    ZONE_NORTH_URL: 'http://127.0.0.1:8081',
    ZONE_CENTRAL_URL: 'http://127.0.0.1:8082',
    ZONE_SOUTH_URL: 'http://127.0.0.1:8083',
  });
}, 2000);

// Graceful shutdown handling
function handleShutdown(signal) {
  isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}. Terminating all cluster nodes...`);
  children.forEach(({ name, process }) => {
    try {
      process.kill();
    } catch {
      // Ignore if already dead
    }
  });
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
