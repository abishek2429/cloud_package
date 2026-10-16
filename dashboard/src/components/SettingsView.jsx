import React, { useState } from 'react';
import { Server, Zap, RefreshCw, CheckCircle2, XCircle, Globe, Database, ShieldCheck, Cpu } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, getCoordinatorHealth } from '../api/trafficApi';

export default function SettingsView({
  pollingInterval,
  onPollingChange,
  lastUpdated,
  onRefresh
}) {
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [testStatus, setTestStatus] = useState(null); // { ok: boolean, latency: number, message: string }
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e) => {
    e?.preventDefault();
    setApiBaseUrl(apiUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    if (onRefresh) onRefresh();
  };

  const handleReset = () => {
    setApiUrl('/api');
    setApiBaseUrl('/api');
    setTestStatus(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    if (onRefresh) onRefresh();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus(null);
    const start = performance.now();
    try {
      // Temporarily test current input or saved
      const health = await getCoordinatorHealth();
      const latency = Math.round(performance.now() - start);
      setTestStatus({
        ok: true,
        latency,
        message: `Coordinator UP • ${health.uptimeSeconds || 0}s uptime • Zones: ${(health.configuredZones || []).join(', ')}`
      });
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      setTestStatus({
        ok: false,
        latency,
        message: err.message || 'Connection refused or timed out'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* 1. Endpoint Target Configuration */}
      <div className="table-card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(6, 182, 212, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Server size={20} color="var(--accent-cyan)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Coordinator API Target Endpoint
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Configure where the React Operations Dashboard sends REST requests
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input-control"
              style={{
                flex: 1,
                minWidth: '280px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-mono)'
              }}
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="/api (Vite Proxy / Vercel Rewrite) or https://your-backend.up.railway.app/api"
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
              Save Target
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1rem' }}
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              <Zap size={14} color="var(--accent-cyan)" />
              <span>{isTesting ? 'Pinging...' : 'Test Ping'}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1rem' }}
              onClick={handleReset}
            >
              Reset (/api)
            </button>
          </div>

          {/* Feedback states */}
          {saveSuccess && (
            <div style={{
              padding: '0.65rem 0.85rem',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid var(--status-online-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--status-online)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle2 size={16} />
              <span>API Base URL successfully updated to: <code>{apiUrl}</code></span>
            </div>
          )}

          {testStatus && (
            <div style={{
              padding: '0.75rem 1rem',
              background: testStatus.ok ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${testStatus.ok ? 'var(--status-online-border)' : 'var(--status-offline-border)'}`,
              borderRadius: 'var(--radius-sm)',
              color: testStatus.ok ? '#86efac' : '#fca5a5',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              {testStatus.ok ? <CheckCircle2 size={18} color="var(--status-online)" /> : <XCircle size={18} color="var(--status-offline)" />}
              <div>
                <strong>{testStatus.ok ? 'Connection Successful' : 'Connection Failed'} ({testStatus.latency} ms)</strong>
                <p style={{ marginTop: '0.2rem', color: 'var(--text-secondary)', fontSize: '0.775rem' }}>{testStatus.message}</p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* 2. Telemetry Refresh & Polling Rates */}
      <div className="table-card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RefreshCw size={20} color="var(--accent-indigo)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Automatic Telemetry Sync Interval
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Frequency at which the dashboard fan-outs queries for fresh partition reports
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Manual (Disabled)', val: 0 },
            { label: 'Every 3 Seconds', val: 3000 },
            { label: 'Every 5 Seconds (Default)', val: 5000 },
            { label: 'Every 10 Seconds', val: 10000 },
            { label: 'Every 30 Seconds', val: 30000 }
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              className={`btn ${pollingInterval === item.val ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.825rem' }}
              onClick={() => onPollingChange(item.val)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {lastUpdated && (
          <p style={{ marginTop: '1rem', fontSize: '0.775rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Last Synced: {lastUpdated.toLocaleTimeString()} ({lastUpdated.toLocaleDateString()})
          </p>
        )}
      </div>

      {/* 3. Distributed Architecture Cloud Topology Reference */}
      <div className="table-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
          Production Deployment Infrastructure Topology
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Physical and cloud deployment tiers hosting the distributed monitoring system
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {/* Frontend Tier */}
          <div style={{
            padding: '1rem',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <Globe size={18} color="var(--accent-cyan)" />
              <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Vercel Edge Platform</strong>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Hosts the React 19 + Vite Operations Dashboard globally on edge CDN with sub-second asset delivery.
            </p>
          </div>

          {/* Coordination & Partitions Tier */}
          <div style={{
            padding: '1rem',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <Cpu size={18} color="var(--accent-indigo)" />
              <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Railway Cluster Service</strong>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Runs the 3 Autonomous Zone Nodes (Ports 8081-8083) and the Central Coordinator Gateway (Port 8080).
            </p>
          </div>

          {/* Database Persistence Tier */}
          <div style={{
            padding: '1rem',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <Database size={18} color="var(--status-online)" />
              <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Render Cloud PostgreSQL</strong>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Managed PostgreSQL 15 providing ACID transactions, foreign keys, and durable recovery across crashes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
