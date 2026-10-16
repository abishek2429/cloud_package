import React from 'react';
import { Hospital, Activity, Database, AlertTriangle, CheckCircle2, BedDouble, ShieldCheck } from 'lucide-react';

export default function NodeCards({ nodes, report }) {
  const hospitalMetadata = [
    {
      id: 'NORTH',
      name: 'North Trauma Center',
      facilityType: 'Level 1 Emergency Trauma',
      port: 8081,
      totalBeds: 45,
      avatarClass: 'north'
    },
    {
      id: 'CENTRAL',
      name: 'Central General Hospital',
      facilityType: 'University Teaching Hospital',
      port: 8082,
      totalBeds: 60,
      avatarClass: 'central'
    },
    {
      id: 'SOUTH',
      name: 'South Memorial Hospital',
      facilityType: 'Regional Burn & Acute Unit',
      port: 8083,
      totalBeds: 40,
      avatarClass: 'south'
    }
  ];

  return (
    <section className="nodes-grid" id="zone-nodes-grid">
      {hospitalMetadata.map((meta) => {
        const node = nodes?.find(n => n.zoneId?.toUpperCase() === meta.id);
        const isOnline = node?.status === 'ONLINE';
        const latency = node?.responseTimeMs ?? 0;
        const incidentCount = node?.incidentCount ?? 0;
        const availableBeds = Math.max(0, meta.totalBeds - incidentCount);
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
                    <Hospital size={20} />
                  </div>
                  <div>
                    <h4 className="node-name">{meta.name}</h4>
                    <div className="node-endpoint">
                      {meta.facilityType} • Port {meta.port}
                    </div>
                  </div>
                </div>

                <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                  <span className="pulsing-dot" />
                  <span>{isOnline ? 'ONLINE' : 'ISOLATED'}</span>
                </div>
              </div>

              {/* Stats Row */}
              <div className="node-stats-row" style={{ marginTop: '1.25rem' }}>
                <div className="node-stat-item">
                  <span className="node-stat-label">Available ICU</span>
                  <span className="node-stat-val" style={{ color: isOnline ? 'var(--status-online)' : 'var(--text-muted)' }}>
                    {isOnline ? `${availableBeds} beds` : '—'}
                  </span>
                </div>

                <div className="node-stat-item">
                  <span className="node-stat-label">Admitted</span>
                  <span className="node-stat-val">
                    {isOnline ? `${incidentCount} cases` : '—'}
                  </span>
                </div>

                <div className="node-stat-item">
                  <span className="node-stat-label">Ping Latency</span>
                  <span className="node-stat-val" style={{ color: isOnline ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    {isOnline ? `${latency} ms` : '—'}
                  </span>
                </div>
              </div>

              {/* Error Box (Visible when isolated / offline) */}
              {!isOnline && errorMessage && (
                <div className="node-error-box" style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                    <AlertTriangle size={13} color="var(--status-offline)" />
                    <span>Hospital Partition Severed:</span>
                  </div>
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Footer with database synchronization status */}
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
                <span>Database: pulsegrid_{meta.id.toLowerCase()} (Dedicated)</span>
              </span>
              <span>
                {isOnline ? 'Surge Status: Accepting Patients' : 'Rerouting Ambulance Dispatch'}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
