import React from 'react';
import { Hospital, CheckCircle2, AlertOctagon, HeartPulse, BedDouble, ShieldCheck, Activity } from 'lucide-react';

export default function OverviewCards({ report, nodes }) {
  const totalHospitals = report?.totalConfiguredZones ?? (nodes?.length || 3);
  const onlineCount = nodes?.filter(n => n.status === 'ONLINE').length ?? (report?.respondingZones?.length || 0);
  const offlineCount = nodes?.filter(n => n.status !== 'ONLINE').length ?? (report?.unavailableZones?.length || 0);

  const totalEmergencies = report?.totalIncidents ?? 0;
  const activeCount = report?.activeIncidents ?? 0;
  const investigatingCount = report?.investigatingIncidents ?? 0;
  const resolvedCount = report?.resolvedIncidents ?? 0;
  const criticalRedCount = report?.highSeverityCount ?? 0;

  const totalIcuBeds = report?.totalIcuBeds || 145;
  const availableIcuBeds = report?.availableIcuBeds ?? Math.max(0, totalIcuBeds - activeCount);
  const icuOccupancyRate = Math.round(((totalIcuBeds - availableIcuBeds) / totalIcuBeds) * 100);

  return (
    <section className="overview-grid" id="overview-metrics-grid">
      {/* 1. Regional Hospital Facilities */}
      <div className="metric-card" id="card-total-nodes" style={{ '--card-accent': 'var(--accent-cyan)' }}>
        <div className="metric-header">
          <span>Hospital Facilities</span>
          <Hospital size={18} color="var(--accent-cyan)" />
        </div>
        <div className="metric-value">
          <span>{totalHospitals}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Trauma Centers</span>
        </div>
        <div className="metric-subtext">
          <span>North Trauma • Central General • South Memorial</span>
        </div>
      </div>

      {/* 2. Available ICU & Trauma Surge Capacity */}
      <div className="metric-card" id="card-icu-beds" style={{ '--card-accent': availableIcuBeds > 20 ? 'var(--status-online)' : 'var(--status-degraded)' }}>
        <div className="metric-header">
          <span>Available ICU Beds</span>
          <BedDouble size={18} color={availableIcuBeds > 20 ? 'var(--status-online)' : 'var(--status-degraded)'} />
        </div>
        <div className="metric-value" style={{ color: availableIcuBeds > 20 ? 'var(--status-online)' : 'var(--status-degraded)' }}>
          <span>{availableIcuBeds}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {totalIcuBeds} Total Beds</span>
        </div>
        <div className="metric-subtext">
          <span style={{ color: icuOccupancyRate > 75 ? 'var(--status-degraded)' : 'var(--text-secondary)' }}>
            {icuOccupancyRate}% Metropolitan ICU Occupancy
          </span>
        </div>
      </div>

      {/* 3. Emergency Dispatches & Critical Triage */}
      <div className="metric-card" id="card-total-emergencies" style={{ '--card-accent': criticalRedCount > 0 ? '#ef4444' : 'var(--accent-blue)' }}>
        <div className="metric-header">
          <span>Active Emergencies</span>
          <HeartPulse size={18} color={criticalRedCount > 0 ? '#ef4444' : 'var(--accent-blue)'} />
        </div>
        <div className="metric-value">
          <span>{totalEmergencies}</span>
          {criticalRedCount > 0 && (
            <span className="status-badge critical" style={{ padding: '0.15rem 0.5rem', fontSize: '0.6875rem', marginLeft: 'auto' }}>
              {criticalRedCount} RED Critical
            </span>
          )}
        </div>
        <div className="metric-subtext">
          <span style={{ color: 'var(--status-offline)', fontWeight: 600 }}>{activeCount} In Transit</span>
          <span>•</span>
          <span style={{ color: 'var(--status-degraded)' }}>{investigatingCount} Admitted</span>
          <span>•</span>
          <span style={{ color: 'var(--status-online)' }}>{resolvedCount} Stabilized</span>
        </div>
      </div>

      {/* 4. Resilient Network State */}
      <div className="metric-card" id="card-offline-nodes" style={{ '--card-accent': offlineCount > 0 ? 'var(--status-offline)' : 'var(--status-online)' }}>
        <div className="metric-header">
          <span>Facility Network State</span>
          {offlineCount > 0 ? (
            <AlertOctagon size={18} color="var(--status-offline)" />
          ) : (
            <ShieldCheck size={18} color="var(--status-online)" />
          )}
        </div>
        <div className="metric-value" style={{ color: offlineCount > 0 ? 'var(--status-offline)' : 'var(--status-online)' }}>
          <span>{onlineCount} / {totalHospitals}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Online</span>
        </div>
        <div className="metric-subtext">
          {offlineCount > 0 ? (
            <span style={{ color: '#fca5a5', fontWeight: 600 }}>
              Hospital Isolated: {report?.unavailableZones?.join(', ') || 'Partial Outage'}
            </span>
          ) : (
            <span style={{ color: 'var(--status-online)' }}>All Hospital Partitions Reaching Consensus</span>
          )}
        </div>
      </div>
    </section>
  );
}
