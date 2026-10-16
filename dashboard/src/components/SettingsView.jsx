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
            background: 'rgba(2, 132, 199, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Server size={20} color="var(--accent-cyan)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-heading)' }}>
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
              placeholder="/api (Default Vite Proxy) or http://127.0.0.1:8080/api"
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
              background: 'var(--status-online-bg)',
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
              background: testStatus.ok ? 'var(--status-online-bg)' : 'var(--status-offline-bg)',
              border: `1px solid ${testStatus.ok ? 'var(--status-online-border)' : 'var(--status-offline-border)'}`,
              borderRadius: 'var(--radius-sm)',
              color: testStatus.ok ? 'var(--status-online)' : 'var(--status-offline)',
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

      {/* 2. Polling Frequency Options */}
      <div className="table-card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(79, 70, 229, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RefreshCw size={20} color="var(--accent-indigo)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              Real-Time Polling Frequency
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Control how frequently the dashboard queries coordinator /api/report
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Hyper-Fast (2s)', value: 2000 },
            { label: 'Standard (5s)', value: 5000 },
            { label: 'Conservative (10s)', value: 10000 },
            { label: 'Manual Only', value: 0 }
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={pollingInterval === opt.value ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '0.5rem 1rem', fontSize: '0.825rem' }}
              onClick={() => onPollingChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {lastUpdated && (
          <p style={{ marginTop: '1rem', fontSize: '0.775rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Telemetry synced at: {lastUpdated.toLocaleTimeString()} (every {pollingInterval > 0 ? `${pollingInterval / 1000}s` : 'manual refresh'})
          </p>
        )}
      </div>

      {/* 3. Distributed Architecture Cloud Topology Reference */}
      <div className="table-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
          Distributed Cluster Infrastructure Topology
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Autonomous tiers hosting the distributed medical emergency & hospital surge system
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
              <strong style={{ color: 'var(--text-heading)', fontSize: '0.9rem' }}>Vite Operations Dashboard</strong>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              React 19 UI running on Port 5173 with sub-millisecond telemetry, dynamic themes, and live chaos injection controls.
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
              <strong style={{ color: 'var(--text-heading)', fontSize: '0.9rem' }}>Coordinator Gateway</strong>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Node.js 20 ESM engine (Port 8080) orchestrating scatter-gather queries, hysteresis health tracking, and bounded backoff.
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
              <strong style={{ color: 'var(--text-heading)', fontSize: '0.9rem' }}>Autonomous Hospital Partitions</strong>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              3 independent hospital nodes (Ports 8081-8083) backed by PostgreSQL 15 ACID storage and resilient in-memory ledgers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
