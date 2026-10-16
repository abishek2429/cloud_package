import React from 'react';
import { Network, Database, ArrowDown, Hospital, Activity, Radio, Cpu, HeartPulse } from 'lucide-react';

export default function TopologyDiagram({ nodes, systemStatus }) {
  const getNode = (id) => nodes?.find(n => n.zoneId?.toUpperCase() === id.toUpperCase());

  const north = getNode('NORTH');
  const central = getNode('CENTRAL');
  const south = getNode('SOUTH');

  const renderHospitalPill = (node, hospitalName, defaultPort, zoneKey, facilityType, totalBeds) => {
    const isOnline = node?.status === 'ONLINE';
    const latency = node?.responseTimeMs ?? 0;
    const incidents = node?.incidentCount ?? 0;
    const availableBeds = Math.max(0, totalBeds - incidents);

    return (
      <div
        className={`topology-node-pill ${isOnline ? 'online' : 'offline'}`}
        id={`topology-node-${zoneKey}`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Radio size={14} color={isOnline ? 'var(--status-online)' : 'var(--status-offline)'} className={isOnline ? 'pulsing-icon' : ''} />
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isOnline ? 'var(--text-main)' : 'var(--status-offline)' }}>
              {hospitalName}
            </span>
          </div>
          <span className={`status-badge ${isOnline ? 'online' : 'offline'}`} style={{ padding: '0.15rem 0.45rem', fontSize: '0.625rem' }}>
            {isOnline ? 'ONLINE' : 'ISOLATED'}
          </span>
        </div>

        <div style={{ fontSize: '0.725rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          Port {defaultPort} • {facilityType}
        </div>

        <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: isOnline ? 'var(--text-secondary)' : 'var(--status-offline)' }}>
          {isOnline
            ? `${availableBeds}/${totalBeds} ICU Beds Available • ${incidents} Patients Admitted (${latency}ms)`
            : (node?.errorMessage || 'Telemetry Connection Timed Out')}
        </div>
      </div>
    );
  };

  const getSystemStatusBadge = () => {
    const onlineCount = nodes?.filter(n => n.status === 'ONLINE').length || 0;
    if (nodes && nodes.length > 0 && onlineCount === 0) {
      return <span className="status-badge critical" style={{ fontSize: '0.7rem' }}>CRITICAL • ALL HOSPITALS ISOLATED</span>;
    }
    const status = systemStatus?.toUpperCase();
    if (status === 'HEALTHY' && onlineCount >= 3) {
      return <span className="status-badge healthy" style={{ fontSize: '0.7rem' }}>HEALTHY • ALL 3 HOSPITALS DISPATCHING</span>;
    }
    if (status === 'PARTIALLY_DEGRADED' || (onlineCount > 0 && onlineCount < 3)) {
      return <span className="status-badge partially-degraded" style={{ fontSize: '0.7rem' }}>SURGE REROUTED • HOSPITAL PARTITION ISOLATED</span>;
    }
    if (status === 'CRITICAL' || onlineCount === 0) {
      return <span className="status-badge critical" style={{ fontSize: '0.7rem' }}>CRITICAL • METROPOLITAN EMS COMMUNICATIONS OUTAGE</span>;
    }
    return <span className="status-badge healthy" style={{ fontSize: '0.7rem' }}>CONNECTING TELEMETRY...</span>;
  };

  return (
    <section className="topology-card" id="cluster-topology-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <HeartPulse size={18} color="#dc2626" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              Metropolitan Hospital Network & Triage Flow
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Scatter-Gather ambulance dispatch & triage telemetry over distributed HTTP REST
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Network: medical-emergency-network
          </span>
          {getSystemStatusBadge()}
        </div>
      </div>

      <div className="topology-container">
        {/* Central Dispatch Coordinator Hub */}
        <div className="coordinator-hub">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <Cpu size={18} color="var(--accent-cyan)" />
            <h4>Central Emergency Medical Dispatch Coordinator (Port 8080)</h4>
          </div>
          <p>Scatter-Gather Triage Engine (Promise.allSettled) • Hysteresis Anti-Flapping Monitor • Bounded Retries (3 attempts)</p>
        </div>

        {/* Dynamic Telemetry Lines with Pulsing Arrows */}
        <div style={{ width: '88%', height: '3px', background: 'var(--border-medium)', position: 'relative', borderRadius: '2px' }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '16%',
            transform: 'translateX(-50%)',
            color: north?.status === 'ONLINE' ? 'var(--status-online)' : 'var(--status-offline)'
          }}>
            <ArrowDown size={20} className={north?.status === 'ONLINE' ? 'pulsing-arrow' : ''} />
          </div>
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: central?.status === 'ONLINE' ? 'var(--status-online)' : 'var(--status-offline)'
          }}>
            <ArrowDown size={20} className={central?.status === 'ONLINE' ? 'pulsing-arrow' : ''} />
          </div>
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '84%',
            transform: 'translateX(-50%)',
            color: south?.status === 'ONLINE' ? 'var(--status-online)' : 'var(--status-offline)'
          }}>
            <ArrowDown size={20} className={south?.status === 'ONLINE' ? 'pulsing-arrow' : ''} />
          </div>
        </div>

        {/* Three Autonomous Regional Hospital Nodes */}
        <div className="topology-branches">
          {renderHospitalPill(north, 'North Trauma Center', '8081', 'north', 'Level 1 Trauma Facility', 45)}
          {renderHospitalPill(central, 'Central General Hospital', '8082', 'central', 'University Teaching Hospital', 60)}
          {renderHospitalPill(south, 'South Memorial Hospital', '8083', 'south', 'Regional Burn & Acute Unit', 40)}
        </div>

        {/* Persistence Tier: 3 Independent Databases (Shared-Nothing Architecture) */}
        <div style={{ width: '100%', marginTop: '0.25rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            <Database size={14} color="var(--accent-indigo)" />
            <span>Shared-Nothing Distributed Database Tier (3 Independent Autonomous Databases)</span>
          </div>

          <div className="topology-branches" style={{ marginTop: '0' }}>
            {/* Database North */}
            <div style={{
              flex: 1,
              minWidth: '220px',
              padding: '0.85rem 1rem',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Database size={14} color="var(--accent-cyan)" />
                  <span style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-main)' }}>
                    Database North
                  </span>
                </div>
                <span className="status-badge" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', background: 'var(--accent-cyan-subtle)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)' }}>
                  ISOLATED
                </span>
              </div>
              <div style={{ fontSize: '0.725rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                pulsegrid_north
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Dedicated Schema & File Ledger • 0 Shared State
              </div>
            </div>

            {/* Database Central */}
            <div style={{
              flex: 1,
              minWidth: '220px',
              padding: '0.85rem 1rem',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Database size={14} color="var(--accent-indigo)" />
                  <span style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-main)' }}>
                    Database Central
                  </span>
                </div>
                <span className="status-badge" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', border: '1px solid var(--accent-indigo)' }}>
                  ISOLATED
                </span>
              </div>
              <div style={{ fontSize: '0.725rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-indigo)' }}>
                pulsegrid_central
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Dedicated Schema & File Ledger • 0 Shared State
              </div>
            </div>

            {/* Database South */}
            <div style={{
              flex: 1,
              minWidth: '220px',
              padding: '0.85rem 1rem',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Database size={14} color="var(--status-online)" />
                  <span style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-main)' }}>
                    Database South
                  </span>
                </div>
                <span className="status-badge" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', background: 'var(--status-online-subtle)', color: 'var(--status-online)', border: '1px solid var(--status-online)' }}>
                  ISOLATED
                </span>
              </div>
              <div style={{ fontSize: '0.725rem', fontFamily: 'var(--font-mono)', color: 'var(--status-online)' }}>
                pulsegrid_south
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Dedicated Schema & File Ledger • 0 Shared State
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
