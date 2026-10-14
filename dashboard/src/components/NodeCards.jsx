import React from 'react';
import { Server, Activity, Database, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export default function NodeCards({ nodes, report }) {
  const zoneMetadata = [
    { id: 'NORTH', name: 'North District', port: 8081, avatarClass: 'north' },
    { id: 'CENTRAL', name: 'Central District', port: 8082, avatarClass: 'central' },
    { id: 'SOUTH', name: 'South District', port: 8083, avatarClass: 'south' }
  ];

  return (
    <section className="nodes-grid" id="zone-nodes-grid">
      {zoneMetadata.map((meta) => {
        const node = nodes?.find(n => n.zoneId?.toUpperCase() === meta.id);
        const isOnline = node?.status === 'ONLINE';
        const latency = node?.responseTimeMs ?? 0;
        const incidentCount = node?.incidentCount ?? 0;
        const errorMessage = node?.errorMessage || (report?.nodeErrors ? report.nodeErrors[meta.id] : null);

        return (
          <div
            key={meta.id}
            id={`node-card-${meta.id.toLowerCase()}`}
            className={`node-card ${isOnline ? 'online' : 'offline'}`}
          >
            <div>
              {/* Header */}
              <div className="node-header">
                <div className="node-title-group">
                  <div className={`node-avatar ${meta.avatarClass}`}>
                    {meta.id.substring(0, 1)}
                  </div>
                  <div>
                    <h4 className="node-name">{meta.name}</h4>
                    <div className="node-endpoint">
                      zone-{meta.id.toLowerCase()}:{meta.port}
                    </div>
                  </div>
                </div>

                <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                  <span className="pulsing-dot" />
                  <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
              </div>

              {/* Stats Row */}
              <div className="node-stats-row" style={{ marginTop: '1.25rem' }}>
                <div className="node-stat-item">
                  <span className="node-stat-label">Latency</span>
                  <span className="node-stat-val" style={{ color: isOnline ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    {isOnline ? `${latency} ms` : '—'}
                  </span>
                </div>

                <div className="node-stat-item">
                  <span className="node-stat-label">Incidents</span>
                  <span className="node-stat-val">
                    {isOnline ? incidentCount : '—'}
                  </span>
                </div>

                <div className="node-stat-item">
                  <span className="node-stat-label">Storage</span>
                  <span className="node-stat-val" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    PostgreSQL
                  </span>
                </div>
              </div>

              {/* Error Box (Visible when offline) */}
              {!isOnline && errorMessage && (
                <div className="node-error-box" style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                    <AlertTriangle size={13} color="var(--status-offline)" />
                    <span>Partition Unreachable:</span>
                  </div>
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Footer with telemetry note */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.725rem',
              color: 'var(--text-muted)'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Database size={12} color="var(--accent-cyan)" />
                <span>Zone Partition: {meta.id}</span>
              </span>
              <span>
                {isOnline ? 'Health: 200 OK' : 'Probe: Timeout / Refused'}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
