import React from 'react';
import { Server, CheckCircle2, AlertOctagon, AlertTriangle, Flame, ShieldCheck } from 'lucide-react';

export default function OverviewCards({ report, nodes }) {
  const totalNodes = report?.totalConfiguredZones ?? (nodes?.length || 3);
  const onlineCount = nodes?.filter(n => n.status === 'ONLINE').length ?? (report?.respondingZones?.length || 0);
  const offlineCount = nodes?.filter(n => n.status !== 'ONLINE').length ?? (report?.unavailableZones?.length || 0);

  const totalIncidents = report?.totalIncidents ?? 0;
  const activeCount = report?.activeIncidents ?? 0;
  const investigatingCount = report?.investigatingIncidents ?? 0;
  const resolvedCount = report?.resolvedIncidents ?? 0;
  const highSeverityCount = report?.highSeverityCount ?? 0;

  return (
    <section className="overview-grid" id="overview-metrics-grid">
      {/* 1. Total Configured Nodes */}
      <div className="metric-card" id="card-total-nodes" style={{ '--card-accent': 'var(--accent-cyan)' }}>
        <div className="metric-header">
          <span>Cluster Partitions</span>
          <Server size={18} color="var(--accent-cyan)" />
        </div>
        <div className="metric-value">
          <span>{totalNodes}</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Zones</span>
        </div>
        <div className="metric-subtext">
          <span>North, Central, South Nodes</span>
        </div>
      </div>

      {/* 2. Online Healthy Nodes */}
      <div className="metric-card" id="card-online-nodes" style={{ '--card-accent': 'var(--status-online)' }}>
        <div className="metric-header">
          <span>Online Nodes</span>
          <CheckCircle2 size={18} color="var(--status-online)" />
        </div>
        <div className="metric-value" style={{ color: onlineCount === totalNodes ? 'var(--status-online)' : '#fff' }}>
          <span>{onlineCount}</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {totalNodes} Active</span>
        </div>
        <div className="metric-subtext">
          <span className="status-badge online" style={{ padding: '0.15rem 0.5rem', fontSize: '0.6875rem' }}>
            {onlineCount === totalNodes ? '100% Operational' : `${Math.round((onlineCount / totalNodes) * 100)}% Available`}
          </span>
        </div>
      </div>

      {/* 3. Offline / Degraded Nodes */}
      <div className="metric-card" id="card-offline-nodes" style={{ '--card-accent': offlineCount > 0 ? 'var(--status-offline)' : 'var(--text-muted)' }}>
        <div className="metric-header">
          <span>Offline Partitions</span>
          {offlineCount > 0 ? (
            <AlertOctagon size={18} color="var(--status-offline)" />
          ) : (
            <ShieldCheck size={18} color="var(--status-online)" />
          )}
        </div>
        <div className="metric-value" style={{ color: offlineCount > 0 ? 'var(--status-offline)' : 'var(--text-muted)' }}>
          <span>{offlineCount}</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Unreachable</span>
        </div>
        <div className="metric-subtext">
          {offlineCount > 0 ? (
            <span style={{ color: '#fca5a5', fontWeight: 600 }}>
              Degraded: {report?.unavailableZones?.join(', ') || 'Partial Outage'}
            </span>
          ) : (
            <span style={{ color: 'var(--status-online)' }}>Zero Partition Failures</span>
          )}
        </div>
      </div>

      {/* 4. Total Incident Volume */}
      <div className="metric-card" id="card-total-incidents" style={{ '--card-accent': 'var(--accent-blue)' }}>
        <div className="metric-header">
          <span>Total Incidents</span>
          <Flame size={18} color={highSeverityCount > 0 ? '#ef4444' : 'var(--accent-blue)'} />
        </div>
        <div className="metric-value">
          <span>{totalIncidents}</span>
          {highSeverityCount > 0 && (
            <span className="status-badge high" style={{ padding: '0.15rem 0.5rem', fontSize: '0.6875rem', marginLeft: 'auto' }}>
              {highSeverityCount} High
            </span>
          )}
        </div>
        <div className="metric-subtext">
          <span style={{ color: 'var(--status-offline)', fontWeight: 600 }}>{activeCount} Active</span>
          <span>•</span>
          <span style={{ color: 'var(--status-degraded)' }}>{investigatingCount} Investigating</span>
          <span>•</span>
          <span style={{ color: 'var(--status-online)' }}>{resolvedCount} Resolved</span>
        </div>
      </div>
    </section>
  );
}
