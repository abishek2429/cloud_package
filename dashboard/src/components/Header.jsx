import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  LayoutDashboard,
  AlertTriangle,
  Terminal,
  ShieldAlert,
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
  Radio,
  Sun,
  Moon
} from 'lucide-react';

export default function Header({
  systemStatus,
  onRefresh,
  isLoading,
  lastUpdated,
  activeTab,
  onTabChange,
  incidentCount = 0,
  logCount = 0
}) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pulsegrid_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pulsegrid_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const getStatusBadge = () => {
    switch (systemStatus?.toUpperCase()) {
      case 'HEALTHY':
        return (
          <div className="status-badge healthy" id="system-status-badge">
            <span className="pulsing-dot" />
            <CheckCircle2 size={13} />
            <span>Healthy (3/3 Nodes)</span>
          </div>
        );
      case 'PARTIALLY_DEGRADED':
        return (
          <div className="status-badge partially-degraded" id="system-status-badge">
            <span className="pulsing-dot" />
            <AlertTriangle size={13} />
            <span>Partially Degraded</span>
          </div>
        );
      case 'CRITICAL':
        return (
          <div className="status-badge critical" id="system-status-badge">
            <span className="pulsing-dot" />
            <XCircle size={13} />
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

  const navItems = [
    {
      id: 'overview',
      label: 'Hospital Network',
      icon: LayoutDashboard,
    },
    {
      id: 'incidents',
      label: 'Emergency Triage',
      icon: AlertTriangle,
      badge: incidentCount > 0 ? incidentCount : null,
    },
    {
      id: 'telemetry',
      label: 'Medical Telemetry',
      icon: Terminal,
      badge: logCount > 0 ? logCount : null,
    },
    {
      id: 'chaos',
      label: 'Outage & Surge Lab',
      icon: ShieldAlert,
    },
    {
      id: 'settings',
      label: 'Network Settings',
      icon: SettingsIcon,
    },
  ];

  return (
    <header className="app-header" id="app-header">
      {/* Upper Brand & Controls Tier */}
      <div className="header-top-tier">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <Activity size={24} color="#dc2626" />
          </div>
          <div>
            <h1 className="brand-title">
              PulseGrid • Emergency Medical & Trauma Network
            </h1>
            <p className="brand-subtitle">
              Autonomous Multi-Hospital Partitioning & Metropolitan Emergency Surge Orchestrator
            </p>
          </div>
        </div>

        <div className="header-controls">
          {getStatusBadge()}

          {/* Light / Dark Mode Toggle */}
          <button
            id="theme-toggle-btn"
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          {/* Quick Refresh Button */}
          <button
            id="manual-refresh-btn"
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={isLoading}
            title="Query coordinator for fresh telemetry report"
          >
            <RefreshCw size={13} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Timestamp */}
          {lastUpdated && (
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs Tier */}
      <nav className="header-nav-bar" id="app-navigation-bar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              type="button"
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {item.badge !== null && item.badge !== undefined && (
                <span className="nav-tab-badge">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
