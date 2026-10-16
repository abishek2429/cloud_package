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
    const status = systemStatus?.toUpperCase() || 'HEALTHY';
    if (status === 'HEALTHY') {
      return <span className="status-badge healthy" style={{ fontSize: '0.7rem' }}>HEALTHY • ALL 3 HOSPITALS DISPATCHING</span>;
    }
    if (status === 'PARTIALLY_DEGRADED') {
      return <span className="status-badge partially-degraded" style={{ fontSize: '0.7rem' }}>SURGE REROUTED • HOSPITAL PARTITION ISOLATED</span>;
    }
    return <span className="status-badge critical" style={{ fontSize: '0.7rem' }}>CRITICAL • METROPOLITAN EMS COMMUNICATIONS OUTAGE</span>;
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

        {/* Persistence Conduits to PostgreSQL */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.65rem 1.25rem',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.775rem',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Database size={16} color="var(--accent-cyan)" />
          <span><strong>PostgreSQL 15</strong> (ACID Patient Ledger • Independent Hospital Connection Pooling • Zero Data Loss)</span>
        </div>
      </div>
    </section>
  );
}
