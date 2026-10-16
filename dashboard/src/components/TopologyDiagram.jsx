import React from 'react';
import { Network, Database, ArrowDown, Activity, Wifi, WifiOff, HardDrive, Cpu, Radio } from 'lucide-react';

export default function TopologyDiagram({ nodes, systemStatus }) {
  const getNode = (id) => nodes?.find(n => n.zoneId?.toUpperCase() === id.toUpperCase());

  const north = getNode('NORTH');
  const central = getNode('CENTRAL');
  const south = getNode('SOUTH');

  const renderNodePill = (node, defaultName, defaultPort, zoneKey, label) => {
    const isOnline = node?.status === 'ONLINE';
    const latency = node?.responseTimeMs ?? 0;
    const incidents = node?.incidentCount ?? 0;

    return (
      <div
        className={`topology-node-pill ${isOnline ? 'online' : 'offline'}`}
        id={`topology-node-${zoneKey}`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Radio size={14} color={isOnline ? 'var(--status-online)' : 'var(--status-offline)'} className={isOnline ? 'pulsing-icon' : ''} />
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isOnline ? '#fff' : '#fca5a5' }}>
              {label} ({defaultName})
            </span>
          </div>
          <span className={`status-badge ${isOnline ? 'online' : 'offline'}`} style={{ padding: '0.15rem 0.45rem', fontSize: '0.625rem' }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <div style={{ fontSize: '0.725rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          Port {defaultPort} • {isOnline ? `${latency} ms latency` : 'Unreachable'}
        </div>

        <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: isOnline ? 'var(--text-secondary)' : '#f87171' }}>
          {isOnline ? `${incidents} Persisted Incidents` : (node?.errorMessage || 'Connection Timed Out')}
        </div>
      </div>
    );
  };

  const getSystemStatusBadge = () => {
    const status = systemStatus?.toUpperCase() || 'HEALTHY';
    if (status === 'HEALTHY') {
      return <span className="status-badge healthy" style={{ fontSize: '0.7rem' }}>HEALTHY • 3/3 PARTITIONS ONLINE</span>;
    }
    if (status === 'PARTIALLY_DEGRADED') {
      return <span className="status-badge partially-degraded" style={{ fontSize: '0.7rem' }}>PARTIALLY DEGRADED • PARTIAL SERVICE ACTIVE</span>;
    }
    return <span className="status-badge critical" style={{ fontSize: '0.7rem' }}>CRITICAL • MULTIPLE PARTITIONS OFFLINE</span>;
  };

  return (
    <section className="topology-card" id="cluster-topology-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(6, 182, 212, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Network size={18} color="var(--accent-cyan)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Distributed Cluster Topology & Telemetry Flow
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Non-blocking scatter-gather scatter/gather fan-out over HTTP REST
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Network: traffic-incident-network
          </span>
          {getSystemStatusBadge()}
        </div>
      </div>

      <div className="topology-container">
        {/* Central Coordinator Hub */}
        <div className="coordinator-hub">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <Cpu size={18} color="var(--accent-cyan)" />
            <h4>Coordinator Service (Port 8080)</h4>
          </div>
          <p>Scatter-Gather Aggregator (Promise.allSettled) • Hysteresis Thresholds: 2 Probes • Bounded Retry (3 attempts)</p>
        </div>

        {/* Dynamic Branch Lines with Flow Animation */}
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

        {/* Three Partition Nodes */}
        <div className="topology-branches">
          {renderNodePill(north, 'zone-north', '8081', 'north', 'Zone North')}
          {renderNodePill(central, 'zone-central', '8082', 'central', 'Zone Central')}
          {renderNodePill(south, 'zone-south', '8083', 'south', 'Zone South')}
        </div>

        {/* Persistence Conduits to PostgreSQL */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.65rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.775rem',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Database size={16} color="var(--accent-cyan)" />
          <span><strong>PostgreSQL 15</strong> (ACID Persistence • Autonomous Connection Pooling • Durably Replicating Telemetry)</span>
        </div>
      </div>
    </section>
  );
}
