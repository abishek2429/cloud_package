import React from 'react';
import { Network, Database, ArrowDown, Activity, Wifi, WifiOff } from 'lucide-react';

export default function TopologyDiagram({ nodes, systemStatus }) {
  const getNode = (id) => nodes?.find(n => n.zoneId?.toUpperCase() === id.toUpperCase());

  const north = getNode('NORTH');
  const central = getNode('CENTRAL');
  const south = getNode('SOUTH');

  const renderNodePill = (node, defaultName, defaultPort, zoneKey) => {
    const isOnline = node?.status === 'ONLINE';
    const latency = node?.responseTimeMs ?? 0;
    const incidents = node?.incidentCount ?? 0;

    return (
      <div
        className={`topology-node-pill ${isOnline ? 'online' : 'offline'}`}
        id={`topology-node-${zoneKey}`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isOnline ? '#fff' : '#fca5a5' }}>
            {defaultName}
          </span>
          <span className={`status-badge ${isOnline ? 'online' : 'offline'}`} style={{ padding: '0.15rem 0.45rem', fontSize: '0.625rem' }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <div style={{ fontSize: '0.725rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          Port {defaultPort} • {isOnline ? `${latency} ms` : 'Unreachable'}
        </div>

        <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: isOnline ? 'var(--text-secondary)' : '#f87171' }}>
          {isOnline ? `${incidents} Persisted Incidents` : (node?.errorMessage || 'Connection Timed Out')}
        </div>
      </div>
    );
  };

  return (
    <section className="topology-card" id="cluster-topology-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Network size={20} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
            Cluster Partition Topology & Data Flow
          </h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Docker Network: traffic-incident-network
        </span>
      </div>

      <div className="topology-container">
        {/* Central Coordinator Hub */}
        <div className="coordinator-hub">
          <h4>Coordinator Service (API Gateway)</h4>
          <p>http://coordinator-service:8080 • Fan-Out CompletableFuture Aggregator</p>
          <div style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <span className={`status-badge ${systemStatus?.toLowerCase() || 'healthy'}`} style={{ fontSize: '0.65rem' }}>
              System: {systemStatus || 'HEALTHY'}
            </span>
          </div>
        </div>

        {/* Dynamic Branch Lines */}
        <div style={{ width: '80%', height: '2px', background: 'var(--border-medium)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-10px', left: '16%', transform: 'translateX(-50%)', color: north?.status === 'ONLINE' ? 'var(--status-online)' : 'var(--status-offline)' }}>
            <ArrowDown size={18} />
          </div>
          <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', color: central?.status === 'ONLINE' ? 'var(--status-online)' : 'var(--status-offline)' }}>
            <ArrowDown size={18} />
          </div>
          <div style={{ position: 'absolute', top: '-10px', left: '84%', transform: 'translateX(-50%)', color: south?.status === 'ONLINE' ? 'var(--status-online)' : 'var(--status-offline)' }}>
            <ArrowDown size={18} />
          </div>
        </div>

        {/* Three Partition Nodes */}
        <div className="topology-branches">
          {renderNodePill(north, 'zone-north', '8081', 'north')}
          {renderNodePill(central, 'zone-central', '8082', 'central')}
          {renderNodePill(south, 'zone-south', '8083', 'south')}
        </div>

        {/* Database Persistence Anchor */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)'
        }}>
          <Database size={14} color="var(--accent-cyan)" />
          <span>PostgreSQL 15 (traffic-db:5432) • Named Volume: traffic-incident-db-data</span>
        </div>
      </div>
    </section>
  );
}
