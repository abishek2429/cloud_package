import React, { useState } from 'react';
import { PlusCircle, Send, Sparkles, Check, AlertCircle, Key } from 'lucide-react';
import { submitIncident } from '../api/trafficApi';

export default function IncidentForm({ onIncidentSubmitted }) {
  const [zoneId, setZoneId] = useState('NORTH');
  const [type, setType] = useState('ACCIDENT');
  const [severity, setSeverity] = useState('HIGH');
  const [status, setStatus] = useState('ACTIVE');
  const [description, setDescription] = useState('');
  const [customId, setCustomId] = useState('');
  const [useCustomId, setUseCustomId] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successFeedback, setSuccessFeedback] = useState(null);

  const presets = [
    {
      title: 'North Accident',
      zone: 'NORTH',
      type: 'ACCIDENT',
      severity: 'HIGH',
      desc: 'Rollover collision blocking 2 express lanes on North Highway Mile 18.'
    },
    {
      title: 'Central Sinkhole',
      zone: 'CENTRAL',
      type: 'ROAD_CLOSED',
      severity: 'HIGH',
      desc: 'Emergency water main rupture causing street closure near Central Plaza.'
    },
    {
      title: 'South Harbor Jam',
      zone: 'SOUTH',
      type: 'TRAFFIC_JAM',
      severity: 'MEDIUM',
      desc: 'Heavy cargo truck congestion heading toward South Pier entrance.'
    }
  ];

  const applyPreset = (preset) => {
    setZoneId(preset.zone);
    setType(preset.type);
    setSeverity(preset.severity);
    setDescription(preset.desc);
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessFeedback(null);

    // Validation
    if (!description || description.trim().length < 5) {
      setFormError('Incident description must be at least 5 characters long.');
      return;
    }
    if (description.length > 500) {
      setFormError('Incident description must not exceed 500 characters.');
      return;
    }

    const payload = {
      zoneId,
      type,
      severity,
      status,
      description: description.trim()
    };

    if (useCustomId && customId.trim()) {
      payload.id = customId.trim().toUpperCase();
    }

    try {
      setIsSubmitting(true);
      const result = await submitIncident(payload);
      setSuccessFeedback(`Incident [${result.id}] submitted successfully to ${result.zoneId}!`);
      setDescription('');
      if (!useCustomId) {
        setCustomId('');
      }
      if (onIncidentSubmitted) {
        onIncidentSubmitted(result);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to submit incident to coordinator');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-card" id="incident-submission-form-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlusCircle size={20} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
            Report Incident
          </h3>
        </div>
        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
          Routes via Coordinator API
        </span>
      </div>

      {/* Preset Pills */}
      <div className="preset-pills-row">
        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Sparkles size={12} color="var(--accent-cyan)" />
          Presets:
        </span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            type="button"
            className="preset-pill"
            onClick={() => applyPreset(p)}
          >
            {p.title}
          </button>
        ))}
      </div>

      {formError && (
        <div style={{
          padding: '0.65rem 0.85rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--status-offline-border)',
          borderRadius: 'var(--radius-sm)',
          color: '#fca5a5',
          fontSize: '0.8rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      )}

      {successFeedback && (
        <div style={{
          padding: '0.65rem 0.85rem',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid var(--status-online-border)',
          borderRadius: 'var(--radius-sm)',
          color: '#6ee7b7',
          fontSize: '0.8rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Check size={16} />
          <span>{successFeedback}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} id="incident-form">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Target Zone */}
          <div className="form-group">
            <label className="form-label" htmlFor="form-zone-select">Target Zone</label>
            <select
              id="form-zone-select"
              className="select-control"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              <option value="NORTH">NORTH — North District</option>
              <option value="CENTRAL">CENTRAL — Central District</option>
              <option value="SOUTH">SOUTH — South District</option>
            </select>
          </div>

          {/* Incident Type */}
          <div className="form-group">
            <label className="form-label" htmlFor="form-type-select">Incident Type</label>
            <select
              id="form-type-select"
              className="select-control"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="ACCIDENT">ACCIDENT</option>
              <option value="TRAFFIC_JAM">TRAFFIC_JAM</option>
              <option value="ROAD_CLOSED">ROAD_CLOSED</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Severity */}
          <div className="form-group">
            <label className="form-label" htmlFor="form-severity-select">Severity Level</label>
            <select
              id="form-severity-select"
              className="select-control"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="HIGH">HIGH (Severe)</option>
              <option value="MEDIUM">MEDIUM (Moderate)</option>
              <option value="LOW">LOW (Minor)</option>
            </select>
          </div>

          {/* Operational Status */}
          <div className="form-group">
            <label className="form-label" htmlFor="form-status-select">Initial Status</label>
            <select
              id="form-status-select"
              className="select-control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>
        </div>

        {/* Custom Idempotency Key Option */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              id="toggle-custom-id"
              checked={useCustomId}
              onChange={(e) => setUseCustomId(e.target.checked)}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Key size={13} color="var(--accent-cyan)" />
              <span>Specify Custom ID (Test Duplicate Detection / Idempotency)</span>
            </span>
          </label>

          {useCustomId && (
            <input
              type="text"
              id="form-custom-id-input"
              className="input-control"
              style={{ width: '100%', marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
              placeholder="e.g. INC-SOUTH-IDEM-999"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
            />
          )}
        </div>

        {/* Description */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" htmlFor="form-description-input">Description</label>
            <span style={{ fontSize: '0.7rem', color: description.length > 480 ? '#f87171' : 'var(--text-muted)' }}>
              {description.length} / 500
            </span>
          </div>
          <textarea
            id="form-description-input"
            className="textarea-control"
            rows="3"
            placeholder="Describe the incident location, cause, lane impact..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          id="submit-incident-btn"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={isSubmitting || description.trim().length < 5}
        >
          <Send size={15} />
          <span>{isSubmitting ? 'Routing via Coordinator...' : 'Submit Incident to Cluster'}</span>
        </button>
      </form>
    </div>
  );
}
