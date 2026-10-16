import React, { useState } from 'react';
import { Terminal, Trash2, Download, CheckCircle, AlertTriangle, Activity, Wifi, ChevronDown, ChevronRight } from 'lucide-react';

export default function ActivityLog({ logs, onClearLogs }) {
  const [filterType, setFilterType] = useState('ALL');
  const [expandedIndices, setExpandedIndices] = useState({});

  const toggleExpand = (idx) => {
    setExpandedIndices(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const filteredLogs = (logs || []).filter((entry) => {
    if (filterType === 'REAL') {
      return entry.type === 'REAL_HTTP_TELEMETRY';
    }
    if (filterType === 'SIMULATION') {
      return entry.type === 'SIMULATION_EVENT';
    }
    if (filterType === 'ERRORS') {
      return !entry.ok || (entry.status && entry.status >= 400);
    }
    return true;
  });

  const totalLogs = logs?.length || 0;
  const errorLogs = (logs || []).filter(e => !e.ok || (e.status && e.status >= 400)).length;
  const successRate = totalLogs > 0 ? Math.round(((totalLogs - errorLogs) / totalLogs) * 100) : 100;
  const avgLatency = totalLogs > 0
    ? Math.round((logs || []).reduce((acc, curr) => acc + (curr.durationMs || 0), 0) / totalLogs)
    : 0;

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `traffic-telemetry-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getMethodBadgeColor = (method) => {
    switch (method?.toUpperCase()) {
      case 'GET':
        return 'var(--accent-cyan)';
      case 'POST':
        return 'var(--status-online)';
      case 'PATCH':
        return 'var(--accent-indigo)';
      case 'PUT':
        return 'var(--status-degraded)';
      case 'DELETE':
        return 'var(--status-offline)';
      default:
        return 'var(--text-muted)';
    }
  };

  return (
    <div className="table-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Telemetry Stream KPI Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Invocations</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-heading)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
            {totalLogs} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>calls</span>
          </div>
        </div>

        <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>HTTP Success Rate</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: successRate >= 95 ? 'var(--status-online)' : 'var(--status-degraded)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
            {successRate}%
          </div>
        </div>

        <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Latency</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
            {avgLatency} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>ms</span>
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Terminal size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)' }}>
            Live Telemetry Event Log
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            ({filteredLogs.length} events visible)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Quick Filter Buttons */}
          {['ALL', 'REAL', 'ERRORS'].map((f) => (
            <button
              key={f}
              type="button"
              className={`btn btn-sm ${filterType === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
              onClick={() => setFilterType(f)}
            >
              {f === 'ALL' ? 'All Events' : (f === 'REAL' ? 'HTTP Telemetry' : 'Errors Only')}
            </button>
          ))}

          <button
            id="export-logs-btn"
            className="btn btn-secondary btn-sm"
            onClick={handleExportJson}
            title="Download activity events as JSON"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
          >
            <Download size={13} />
            <span>Export JSON</span>
          </button>

          <button
            id="clear-logs-btn"
            className="btn btn-secondary btn-sm"
            onClick={onClearLogs}
            title="Clear current log buffer"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* 3. Spacious Terminal Stream */}
      <div className="activity-list" id="activity-log-stream" style={{ maxHeight: '600px', minHeight: '380px' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
            <Activity size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
            <p>No telemetry events logged yet. Invocations and polling events will appear here in real time.</p>
          </div>
        ) : (
          filteredLogs.map((entry, idx) => {
            const isError = !entry.ok || (entry.status && entry.status >= 400);
            const isReal = entry.type === 'REAL_HTTP_TELEMETRY';
            const timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
            const isExpanded = !!expandedIndices[idx];

            return (
              <div
                key={idx}
                className={`activity-item ${isError ? 'error' : (entry.method === 'CONFIG' ? 'config' : 'success')}`}
                id={`activity-item-${idx}`}
                style={{ cursor: 'pointer' }}
                onClick={() => toggleExpand(idx)}
              >
                <div className="activity-meta-line">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isExpanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}

                    {/* Method Tag */}
                    <span style={{
                      fontWeight: 700,
                      color: getMethodBadgeColor(entry.method),
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {entry.method}
                    </span>

                    {/* Telemetry Origin Badge */}
                    {isReal ? (
                      <span className="tag-real-telemetry">
                        HTTP Call
                      </span>
                    ) : (
                      <span className="tag-simulation-event">
                        Event
                      </span>
                    )}

                    {/* Status Code */}
                    {entry.status > 0 && (
                      <span style={{
                        padding: '0.1rem 0.4rem',
                        borderRadius: '3px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        background: isError ? 'var(--status-offline-bg)' : 'var(--status-online-bg)',
                        color: isError ? 'var(--status-offline)' : 'var(--status-online)',
                        border: `1px solid ${isError ? 'var(--status-offline-border)' : 'var(--status-online-border)'}`
                      }}>
                        {entry.status}
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {entry.durationMs > 0 && `${entry.durationMs}ms • `}{timeStr}
                  </span>
                </div>

                {/* Endpoint */}
                <div className="activity-endpoint" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  {entry.endpoint}
                </div>

                {/* Details snippet or expanded view */}
                {entry.details && (
                  <div style={{
                    marginTop: '0.35rem',
                    fontSize: '0.725rem',
                    fontFamily: 'var(--font-mono)',
                    color: isError ? 'var(--status-offline)' : 'var(--text-secondary)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    overflowX: 'auto',
                    whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                    textOverflow: isExpanded ? 'clip' : 'ellipsis',
                    maxHeight: isExpanded ? '300px' : '32px'
                  }}>
                    {typeof entry.details === 'object'
                      ? JSON.stringify(entry.details, null, isExpanded ? 2 : 0)
                      : String(entry.details)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
