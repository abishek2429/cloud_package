import React, { useState } from 'react';
import { Terminal, Trash2, Download, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export default function ActivityLog({ logs, onClearLogs }) {
  const [filterType, setFilterType] = useState('ALL');

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
        return '#06b6d4';
      case 'POST':
        return '#10b981';
      case 'PATCH':
        return '#8b5cf6';
      case 'PUT':
        return '#f59e0b';
      case 'DELETE':
        return '#ef4444';
      default:
        return 'var(--text-muted)';
    }
  };

  return (
    <div className="activity-card" id="telemetry-activity-panel">
      {/* Header */}
      <div className="activity-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Terminal size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
            Message & Telemetry Activity
          </h3>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            ({filteredLogs.length})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            id="activity-filter-select"
            className="select-control"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">All Events</option>
            <option value="REAL">Real HTTP Telemetry</option>
            <option value="SIMULATION">Simulation Events</option>
            <option value="ERRORS">Errors Only</option>
          </select>

          <button
            id="export-logs-btn"
            className="btn btn-secondary btn-sm"
            onClick={handleExportJson}
            title="Export activity logs as JSON"
            style={{ padding: '0.25rem 0.5rem' }}
          >
            <Download size={13} />
          </button>

          <button
            id="clear-logs-btn"
            className="btn btn-secondary btn-sm"
            onClick={onClearLogs}
            title="Clear activity log list"
            style={{ padding: '0.25rem 0.5rem' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Log Stream */}
      <div className="activity-list" id="activity-log-stream">
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            No activity events recorded yet. Perform actions or wait for polling.
          </div>
        ) : (
          filteredLogs.map((entry, idx) => {
            const isError = !entry.ok || (entry.status && entry.status >= 400);
            const isReal = entry.type === 'REAL_HTTP_TELEMETRY';
            const timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';

            return (
              <div
                key={idx}
                className={`activity-item ${isError ? 'error' : (entry.method === 'CONFIG' ? 'config' : 'success')}`}
                id={`activity-item-${idx}`}
              >
                <div className="activity-meta-line">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    {/* Method Tag */}
                    <span style={{
                      fontWeight: 700,
                      color: getMethodBadgeColor(entry.method),
                      fontSize: '0.725rem'
                    }}>
                      {entry.method}
                    </span>

                    {/* Telemetry Origin Badge */}
                    {isReal ? (
                      <span className="tag-real-telemetry">
                        Real HTTP Telemetry
                      </span>
                    ) : (
                      <span className="tag-simulation-event">
                        Simulation Event
                      </span>
                    )}

                    {/* Status Code */}
                    {entry.status > 0 && (
                      <span style={{
                        padding: '0.1rem 0.35rem',
                        borderRadius: '3px',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        background: isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: isError ? '#f87171' : '#34d399'
                      }}>
                        {entry.status}
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    {entry.durationMs > 0 && `${entry.durationMs}ms • `}{timeStr}
                  </span>
                </div>

                {/* Endpoint */}
                <div className="activity-endpoint">
                  {entry.endpoint}
                </div>

                {/* Details snippet */}
                {entry.details && (
                  <div style={{
                    fontSize: '0.7rem',
                    color: isError ? '#fca5a5' : 'var(--text-secondary)',
                    maxHeight: '60px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {typeof entry.details === 'object'
                      ? JSON.stringify(entry.details)
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
