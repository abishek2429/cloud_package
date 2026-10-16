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
          <strong style={{ display: 'block', marginBottom: '0.2rem' }}>
            Hospital Partition Outage Detected (System Status: PARTIALLY_DEGRADED)
          </strong>
          <span>
            Hospital trauma node(s) <strong>[{unavailableZones?.join(', ')}]</strong> are severed or unreachable. 
            The Emergency Dispatch Coordinator is employing <em>Graceful Partition Degradation</em>: ambulance dispatch is automatically rerouted to surviving facilities <strong>[{respondingZones?.join(', ')}]</strong> without service failure.
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
          <strong style={{ display: 'block', marginBottom: '0.2rem' }}>
            Critical Healthcare Network Communications Collapse (Status: CRITICAL)
          </strong>
          <span>
            All regional hospital nodes are currently unreachable from the central dispatch gateway. Check Docker / cloud network partitions.
          </span>
        </div>
      </div>
    );
  }

  return null;
}
