import React, { useState } from 'react';
import { Table, Search, Filter, AlertCircle, CheckCircle, Clock, ArrowUpDown, Download } from 'lucide-react';
import { updateIncidentStatus } from '../api/trafficApi';

export default function IncidentTable({ incidents, onStatusUpdated, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  const exportToCSV = () => {
    if (!filteredIncidents.length) return;
    const headers = ['ID', 'Zone', 'Type', 'Severity', 'Status', 'Description', 'Timestamp'];
    const rows = filteredIncidents.map(i => [
      i.id,
      i.zoneId,
      i.type,
      i.severity,
      i.status,
      `"${(i.description || '').replace(/"/g, '""')}"`,
      i.timestamp
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `traffic_incidents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStatusChange = async (incident, newStatus) => {
    try {
      setUpdatingId(incident.id);
      await updateIncidentStatus(incident.zoneId, incident.id, newStatus);
      if (onStatusUpdated) {
        onStatusUpdated();
      }
    } catch (err) {
      alert(`Failed to update status for ${incident.id}: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredIncidents = (incidents || []).filter((item) => {
    // Zone filter
    if (zoneFilter !== 'ALL' && item.zoneId?.toUpperCase() !== zoneFilter) {
      return false;
    }
    // Severity filter
    if (severityFilter !== 'ALL' && item.severity !== severityFilter) {
      return false;
    }
    // Status filter
    if (statusFilter !== 'ALL' && item.status !== statusFilter) {
      return false;
    }
    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchId = item.id?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchZone = item.zoneId?.toLowerCase().includes(q);
      const matchType = item.type?.toLowerCase().includes(q);
      return matchId || matchDesc || matchZone || matchType;
    }
    return true;
  });

  const formatTimestamp = (isoString) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return isoString;
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'HIGH':
        return 'high';
      case 'MEDIUM':
        return 'medium';
      case 'LOW':
        return 'low';
      default:
        return 'low';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'critical';
      case 'INVESTIGATING':
        return 'investigating';
      case 'RESOLVED':
        return 'resolved';
      default:
        return 'healthy';
    }
  };

  return (
    <div className="table-card" id="incidents-table-container">
      {/* Table Header with Filters */}
      <div className="table-header-bar">
        <div className="table-title">
          <Table size={20} color="var(--accent-cyan)" />
          <span>City-Wide Incident Register</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            ({filteredIncidents.length} of {incidents?.length || 0})
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: '0.5rem', padding: '0.2rem 0.55rem', fontSize: '0.725rem' }}
            onClick={exportToCSV}
            disabled={!filteredIncidents.length}
            title="Download current incident register as CSV"
          >
            <Download size={13} />
            <span>CSV</span>
          </button>
        </div>

        <div className="table-filters">
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="search-incidents-input"
              type="text"
              className="input-control"
              style={{ paddingLeft: '2rem', width: '180px', fontSize: '0.8rem' }}
              placeholder="Filter by keyword / ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Zone Selector */}
          <select
            id="filter-zone-select"
            className="select-control"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
          >
            <option value="ALL">All Zones</option>
            <option value="NORTH">North Zone</option>
            <option value="CENTRAL">Central Zone</option>
            <option value="SOUTH">South Zone</option>
          </select>

          {/* Severity Selector */}
          <select
            id="filter-severity-select"
            className="select-control"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="ALL">All Severities</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status Selector */}
          <select
            id="filter-status-select"
            className="select-control"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="table-responsive">
        <table className="incident-table" id="incident-data-table">
          <thead>
            <tr>
              <th>Incident ID</th>
              <th>Zone Partition</th>
              <th>Classification</th>
              <th>Severity</th>
              <th>Description</th>
              <th>Recorded At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  <AlertCircle size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p>No traffic incident records found matching current filters.</p>
                </td>
              </tr>
            ) : (
              filteredIncidents.map((incident) => (
                <tr key={incident.id} id={`row-incident-${incident.id}`}>
                  {/* ID */}
                  <td className="incident-id-cell">
                    {incident.id}
                  </td>

                  {/* Zone */}
                  <td>
                    <span className="status-badge" style={{ background: 'var(--bg-surface-elevated)', color: '#fff', fontSize: '0.7rem' }}>
                      {incident.zoneId}
                    </span>
                  </td>

                  {/* Type */}
                  <td>
                    <span className={`type-pill ${incident.type?.toLowerCase()}`}>
                      {incident.type?.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Severity */}
                  <td>
                    <span className={`status-badge ${getSeverityBadgeClass(incident.severity)}`} style={{ fontSize: '0.6875rem' }}>
                      {incident.severity}
                    </span>
                  </td>

                  {/* Description */}
                  <td style={{ maxWidth: '320px', lineHeight: 1.4 }}>
                    {incident.description}
                  </td>

                  {/* Timestamp */}
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatTimestamp(incident.timestamp)}
                  </td>

                  {/* Status */}
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(incident.status)}`} style={{ fontSize: '0.6875rem' }}>
                      {incident.status}
                    </span>
                  </td>

                  {/* Quick Status Action */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {incident.status === 'ACTIVE' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={updatingId === incident.id}
                        onClick={() => handleStatusChange(incident, 'INVESTIGATING')}
                        title="Mark as investigating"
                      >
                        Investigate
                      </button>
                    )}
                    {incident.status === 'INVESTIGATING' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={updatingId === incident.id}
                        onClick={() => handleStatusChange(incident, 'RESOLVED')}
                        title="Mark as resolved"
                        style={{ color: 'var(--status-online)', borderColor: 'var(--status-online-border)' }}
                      >
                        Resolve
                      </button>
                    )}
                    {incident.status === 'RESOLVED' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Closed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
