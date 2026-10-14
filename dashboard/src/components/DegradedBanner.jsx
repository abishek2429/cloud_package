import React from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle2, Info } from 'lucide-react';

export default function DegradedBanner({ report }) {
  if (!report) return null;

  const { systemStatus, unavailableZones, respondingZones } = report;

  if (systemStatus === 'PARTIALLY_DEGRADED') {
    return (
      <div className="degraded-banner warning" id="degraded-alert-banner">
        <AlertTriangle size={24} style={{ flexShrink: 0, color: 'var(--status-degraded)' }} />
        <div style={{ flex: 1 }}>
          <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>
            Partial Partition Degradation Detected (System Status: PARTIALLY_DEGRADED)
          </strong>
          <span>
            Zone node partition(s) <strong style={{ color: '#fca5a5' }}>[{unavailableZones?.join(', ')}]</strong> are currently offline or unreachable. 
            The Coordinator is employing <em>Graceful Degradation</em>: returning surviving telemetry from <strong style={{ color: '#86efac' }}>[{respondingZones?.join(', ')}]</strong> without crashing or returning an HTTP 500 error.
          </span>
        </div>
      </div>
    );
  }

  if (systemStatus === 'CRITICAL') {
    return (
      <div className="degraded-banner critical" id="critical-alert-banner">
        <AlertOctagon size={24} style={{ flexShrink: 0, color: 'var(--status-offline)' }} />
        <div style={{ flex: 1 }}>
          <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>
            Critical Cluster Outage (System Status: CRITICAL)
          </strong>
          <span>
            All configured zone nodes are currently unreachable. Check Docker daemon and network connectivity.
          </span>
        </div>
      </div>
    );
  }

  return null;
}
