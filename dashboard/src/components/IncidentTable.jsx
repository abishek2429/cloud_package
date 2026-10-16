import React, { useState } from 'react';
import { Table, Search, Filter, AlertCircle, CheckCircle, Clock, ArrowUpDown, Download, HeartPulse, Hospital, Check, RefreshCw } from 'lucide-react';
import { updateIncidentStatus } from '../api/trafficApi';

export default function IncidentTable({ incidents, onStatusUpdated, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  const hospitalNames = {
    'NORTH': 'North Trauma Center',
    'CENTRAL': 'Central General Hospital',
    'SOUTH': 'South Memorial Hospital'
  };

  const exportToCSV = () => {
    if (!filteredIncidents.length) return;
    const headers = ['Intake_ID', 'Hospital_Facility', 'Clinical_Condition', 'Triage_Priority', 'Care_Status', 'Clinical_Notes', 'Timestamp'];
    const rows = filteredIncidents.map(i => [
      i.id,
      hospitalNames[i.zoneId?.toUpperCase()] || i.zoneId,
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
    link.setAttribute('download', `emergency_triage_register_${new Date().toISOString().slice(0, 10)}.csv`);
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
      alert(`Failed to update admission status for ${incident.id}: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredIncidents = (incidents || []).filter((item) => {
    // Hospital filter
    if (zoneFilter !== 'ALL' && item.zoneId?.toUpperCase() !== zoneFilter) {
      return false;
    }
    // Severity / Triage filter
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
      const matchHospital = (hospitalNames[item.zoneId?.toUpperCase()] || '').toLowerCase().includes(q);
      const matchType = item.type?.toLowerCase().includes(q);
      return matchId || matchDesc || matchZone || matchHospital || matchType;
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

  const getTriageBadge = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'HIGH':
        return (
          <span className="status-badge critical" style={{ fontSize: '0.6875rem' }}>
            🔴 RED (Immediate)
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="status-badge partially-degraded" style={{ fontSize: '0.6875rem' }}>
            🟡 YELLOW (Urgent)
          </span>
        );
      case 'LOW':
        return (
          <span className="status-badge healthy" style={{ fontSize: '0.6875rem' }}>
            🟢 GREEN (Minor)
          </span>
        );
      default:
        return (
          <span className="status-badge low" style={{ fontSize: '0.6875rem' }}>
            {severity}
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return (
          <span className="status-badge critical" style={{ fontSize: '0.6875rem' }}>
            In-Transit
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="status-badge partially-degraded" style={{ fontSize: '0.6875rem' }}>
            Admitted / Bay
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="status-badge resolved" style={{ fontSize: '0.6875rem' }}>
            ICU Stabilized
          </span>
        );
      default:
        return (
          <span className="status-badge healthy" style={{ fontSize: '0.6875rem' }}>
            {status}
          </span>
        );
    }
  };

  return (
    <div className="table-card" id="incidents-table-container">
      {/* Table Header with Filters */}
      <div className="table-header-bar">
        <div className="table-title">
          <HeartPulse size={20} color="#f87171" />
          <span>Metropolitan Emergency Medical Register</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            ({filteredIncidents.length} of {incidents?.length || 0} admissions)
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: '0.5rem', padding: '0.2rem 0.55rem', fontSize: '0.725rem' }}
            onClick={exportToCSV}
            disabled={!filteredIncidents.length}
            title="Download emergency triage register as CSV spreadsheet"
          >
            <Download size={13} />
            <span>Export CSV</span>
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
              style={{ paddingLeft: '2rem', width: '200px', fontSize: '0.8rem' }}
              placeholder="Search patient / condition..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Hospital Selector */}
          <select
            id="filter-zone-select"
            className="select-control"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
          >
            <option value="ALL">All Hospitals</option>
            <option value="NORTH">North Trauma Center</option>
            <option value="CENTRAL">Central General Hospital</option>
            <option value="SOUTH">South Memorial Hospital</option>
          </select>

          {/* Triage Selector */}
          <select
            id="filter-severity-select"
            className="select-control"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="ALL">All Triage Categories</option>
            <option value="HIGH">🔴 RED (Immediate Life Threat)</option>
            <option value="MEDIUM">🟡 YELLOW (Urgent Stabilization)</option>
            <option value="LOW">🟢 GREEN (Minor / Ambulatory)</option>
          </select>

          {/* Status Selector */}
          <select
            id="filter-status-select"
            className="select-control"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Care Stages</option>
            <option value="ACTIVE">In-Transit</option>
            <option value="INVESTIGATING">Admitted / In Triage</option>
            <option value="RESOLVED">ICU Stabilized</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="table-responsive">
        <table className="incident-table" id="incident-data-table">
          <thead>
            <tr>
              <th>Intake ID</th>
              <th>Assigned Hospital</th>
              <th>Clinical Condition</th>
              <th>Triage Priority</th>
              <th>Clinical Notes</th>
              <th>Admitted At</th>
              <th>Care Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  <AlertCircle size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p>No emergency medical records found matching current filters.</p>
                </td>
              </tr>
            ) : (
              filteredIncidents.map((incident) => (
                <tr key={incident.id} id={`row-incident-${incident.id}`}>
                  {/* ID */}
                  <td className="incident-id-cell">
                    {incident.id}
                  </td>

                  {/* Hospital */}
                  <td>
                    <span className="status-badge" style={{ background: 'var(--bg-surface-elevated)', color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
                      {hospitalNames[incident.zoneId?.toUpperCase()] || incident.zoneId}
                    </span>
                  </td>

                  {/* Condition Type */}
                  <td>
                    <span className="type-pill" style={{
                      background: 'rgba(6, 182, 212, 0.12)',
                      color: 'var(--accent-cyan)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem'
                    }}>
                      {incident.type?.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Triage Priority */}
                  <td>
                    {getTriageBadge(incident.severity)}
                  </td>

                  {/* Description */}
                  <td style={{ maxWidth: '320px', lineHeight: 1.45, fontSize: '0.8rem' }}>
                    {incident.description}
                  </td>

                  {/* Timestamp */}
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatTimestamp(incident.timestamp)}
                  </td>

                  {/* Status */}
                  <td>
                    {getStatusBadge(incident.status)}
                  </td>

                  {/* Action Quick Status Buttons */}
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {incident.status === 'ACTIVE' && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                          onClick={() => handleStatusChange(incident, 'INVESTIGATING')}
                          disabled={updatingId === incident.id}
                        >
                          {updatingId === incident.id ? 'Saving...' : 'Admit Bay'}
                        </button>
                      )}

                      {incident.status === 'INVESTIGATING' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                          onClick={() => handleStatusChange(incident, 'RESOLVED')}
                          disabled={updatingId === incident.id}
                        >
                          {updatingId === incident.id ? 'Saving...' : 'Stabilize ICU'}
                        </button>
                      )}

                      {incident.status === 'RESOLVED' && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--status-online)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Check size={12} />
                          <span>Bed Secured</span>
                        </span>
                      )}
                    </div>
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
