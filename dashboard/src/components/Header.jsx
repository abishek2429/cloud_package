import React, { useState } from 'react';
import { Activity, RefreshCw, Server, Settings, CheckCircle2, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl } from '../api/trafficApi';

export default function Header({
  systemStatus,
  onRefresh,
  isLoading,
  pollingInterval,
  onPollingChange,
  lastUpdated
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(getApiBaseUrl());

  const handleSaveApiUrl = (e) => {
    e.preventDefault();
    setApiBaseUrl(customApiUrl);
    setShowSettings(false);
    onRefresh();
  };

  const getStatusBadge = () => {
    switch (systemStatus) {
      case 'HEALTHY':
        return (
          <div className="status-badge healthy" id="system-status-badge">
            <span className="pulsing-dot" />
            <CheckCircle2 size={14} />
            <span>Healthy (3/3 Nodes)</span>
          </div>
        );
      case 'PARTIALLY_DEGRADED':
        return (
          <div className="status-badge partially-degraded" id="system-status-badge">
            <span className="pulsing-dot" />
            <AlertTriangle size={14} />
            <span>Partially Degraded</span>
          </div>
        );
      case 'CRITICAL':
        return (
          <div className="status-badge critical" id="system-status-badge">
            <span className="pulsing-dot" />
            <XCircle size={14} />
            <span>Critical Outage</span>
          </div>
        );
      default:
        return (
          <div className="status-badge healthy" id="system-status-badge">
            <span className="pulsing-dot" />
            <span>Connecting...</span>
          </div>
        );
    }
  };

  return (
    <header className="app-header" id="app-header">
      <div className="brand-section">
        <div className="brand-icon-wrapper">
          <Activity size={26} />
        </div>
        <div>
          <h1 className="brand-title">
            Traffic Incident Monitoring System
          </h1>
          <p className="brand-subtitle">
            Distributed Systems Telemetry & Resilient Multi-Zone Partition Aggregator
          </p>
        </div>
      </div>

      <div className="header-controls">
        {getStatusBadge()}

        {/* Polling Interval Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Poll:</span>
          <select
            id="polling-interval-select"
            className="select-control"
            value={pollingInterval}
            onChange={(e) => onPollingChange(Number(e.target.value))}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
          >
            <option value={0}>Manual (Off)</option>
            <option value={3000}>Every 3s</option>
            <option value={5000}>Every 5s</option>
            <option value={10000}>Every 10s</option>
            <option value={30000}>Every 30s</option>
          </select>
        </div>

        {/* Refresh Button */}
        <button
          id="manual-refresh-btn"
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={isLoading}
          title="Manually query coordinator for fresh city report"
        >
          <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
        </button>

        {/* API Target Settings Toggle */}
        <button
          id="api-settings-btn"
          className="btn btn-secondary btn-sm"
          onClick={() => setShowSettings(!showSettings)}
          title="Configure API Base URL Target"
        >
          <Settings size={14} />
          <span>Endpoint</span>
        </button>

        {/* Last Updated Label */}
        {lastUpdated && (
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Settings Modal Bar */}
      {showSettings && (
        <form onSubmit={handleSaveApiUrl} style={{
          width: '100%',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <Server size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>API Base URL:</span>
          <input
            id="api-target-input"
            type="text"
            className="input-control"
            style={{ flex: 1, padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
            value={customApiUrl}
            onChange={(e) => setCustomApiUrl(e.target.value)}
            placeholder="/api (Vite Proxy) or http://localhost:8080"
          />
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setCustomApiUrl('/api');
              setApiBaseUrl('/api');
              setShowSettings(false);
              onRefresh();
            }}
          >
            Reset (/api)
          </button>
        </form>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}
