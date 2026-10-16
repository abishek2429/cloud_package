import React, { useState } from 'react';
import { PlusCircle, Send, Sparkles, Check, AlertCircle, Key, HeartPulse, Hospital, Ambulance } from 'lucide-react';
import { submitIncident } from '../api/trafficApi';

export default function IncidentForm({ onIncidentSubmitted }) {
  const [zoneId, setZoneId] = useState('NORTH');
  const [type, setType] = useState('MASS_TRAUMA');
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
      title: 'North Polytrauma',
      zone: 'NORTH',
      type: 'MASS_TRAUMA',
      severity: 'HIGH',
      desc: 'Highway 104 Multi-vehicle collision: 3 polytrauma patients in shock requiring immediate trauma resuscitation.'
    },
    {
      title: 'Central STEMI Alert',
      zone: 'CENTRAL',
      type: 'CARDIAC_ARREST',
      severity: 'HIGH',
      desc: '62yo male with acute STEMI and hemodynamic instability en route to Cardiac Catheterization Lab.'
    },
    {
      title: 'South Flash Burn',
      zone: 'SOUTH',
      type: 'BURN_CRITICAL',
      severity: 'HIGH',
      desc: 'Industrial flash chemical fire: 35% total body surface area burns requiring specialized Burn ICU bed.'
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
      setFormError('Emergency triage description must be at least 5 characters long.');
      return;
    }
    if (description.length > 500) {
      setFormError('Emergency triage description must not exceed 500 characters.');
      return;
    }

    const payload = {
      hospitalId: zoneId,
      zoneId,
      conditionType: type,
      type,
      triageLevel: severity,
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
      setSuccessFeedback(`Emergency intake [${result.id}] dispatched successfully to ${result.zoneId}!`);
      setDescription('');
      if (!useCustomId) {
        setCustomId('');
      }
      if (onIncidentSubmitted) {
        onIncidentSubmitted(result);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to route emergency dispatch to coordinator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSeed = async () => {
    setIsSubmitting(true);
    setFormError(null);
    setSuccessFeedback(null);
    try {
      let createdCount = 0;
      for (const preset of presets) {
        await submitIncident({
          hospitalId: preset.zone,
          zoneId: preset.zone,
          conditionType: preset.type,
          type: preset.type,
          triageLevel: preset.severity,
          severity: preset.severity,
          status: 'ACTIVE',
          description: preset.desc
        });
        createdCount++;
      }
      setSuccessFeedback(`⚡ Successfully dispatched ${createdCount} live trauma emergencies across North, Central, and South hospitals!`);
      if (onIncidentSubmitted) {
        onIncidentSubmitted();
      }
    } catch (err) {
      setFormError(`Batch dispatch encountered an issue: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-card" id="incident-submission-form-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Ambulance size={20} color="#dc2626" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)' }}>
            Dispatch Critical Emergency Patient
          </h3>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
          onClick={handleBatchSeed}
          disabled={isSubmitting}
          title="Instantly dispatch 3 critical emergencies (one to North Trauma, Central General, South Memorial)"
        >
          ⚡ Seed All 3 Hospitals
        </button>
      </div>

      {/* Preset Pills */}
      <div className="preset-pills-row">
        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Sparkles size={12} color="var(--accent-cyan)" />
          Quick Triage Scenarios:
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
          background: 'var(--status-offline-bg)',
          border: '1px solid var(--status-offline-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--status-offline)',
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
          background: 'var(--status-online-bg)',
          border: '1px solid var(--status-online-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--status-online)',
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
          {/* Target Hospital */}
          <div className="form-group">
            <label className="form-label" htmlFor="form-zone-select">Assigned Hospital Facility</label>
            <select
              id="form-zone-select"
              className="select-control"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              <option value="NORTH">NORTH — North Trauma Center (Level 1)</option>
              <option value="CENTRAL">CENTRAL — Central General Hospital</option>
              <option value="SOUTH">SOUTH — South Memorial Hospital (Burn Unit)</option>
            </select>
          </div>

          {/* Emergency Condition Type */}
          <div className="form-group">
            <label className="form-label" htmlFor="form-type-select">Emergency Clinical Condition</label>
            <select
              id="form-type-select"
              className="select-control"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="MASS_TRAUMA">MASS_TRAUMA (Polytrauma / Collision)</option>
              <option value="CARDIAC_ARREST">CARDIAC_ARREST (Acute STEMI)</option>
              <option value="RESPIRATORY_FAILURE">RESPIRATORY_FAILURE (Needs Ventilator)</option>
              <option value="SURGICAL_EMERGENCY">SURGICAL_EMERGENCY (Internal Hemorrhage)</option>
              <option value="BURN_CRITICAL">BURN_CRITICAL (Chemical / Thermal Flash)</option>
              <option value="STROKE_ALERT">STROKE_ALERT (Acute Ischemia)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Triage Severity */}
          <div className="form-group">
            <label className="form-label" htmlFor="form-severity-select">Triage Category (Priority)</label>
            <select
              id="form-severity-select"
              className="select-control"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="HIGH">🔴 RED — Immediate Life Threat (High)</option>
              <option value="MEDIUM">🟡 YELLOW — Urgent Stabilization (Medium)</option>
              <option value="LOW">🟢 GREEN — Ambulatory / Minor (Low)</option>
            </select>
          </div>

          {/* Admission Lifecycle Status */}
          <div className="form-group">
            <label className="form-label" htmlFor="form-status-select">Dispatch / Care Status</label>
            <select
              id="form-status-select"
              className="select-control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">ACTIVE — En Route / In-Transit</option>
              <option value="INVESTIGATING">INVESTIGATING — Admitted in Triage Bay</option>
              <option value="RESOLVED">RESOLVED — ICU Stabilized / Bed Allocated</option>
            </select>
          </div>
        </div>

        {/* Clinical Case Description */}
        <div className="form-group">
          <label className="form-label" htmlFor="form-desc-input">Clinical Triage Description</label>
          <textarea
            id="form-desc-input"
            className="textarea-control"
            rows={3}
            placeholder="Document patient vitals, trauma mechanism, and immediate specialty operating requirements..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            <span>Min 5 chars • Stored durably in hospital PostgreSQL ledger</span>
            <span>{description.length} / 500</span>
          </div>
        </div>

        {/* Client Idempotency Key Toggle */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={useCustomId}
              onChange={(e) => setUseCustomId(e.target.checked)}
            />
            <Key size={13} color="var(--accent-cyan)" />
            <span>Assign Explicit Idempotency Key (Prevents Duplicate Hospital Admission)</span>
          </label>

          {useCustomId && (
            <div style={{ marginTop: '0.5rem' }}>
              <input
                type="text"
                className="input-control"
                placeholder="e.g. EMS-NORTH-90214-A"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.65rem' }}
          disabled={isSubmitting}
        >
          <Send size={15} />
          <span>{isSubmitting ? 'Routing Through Dispatch Coordinator...' : 'Dispatch Emergency Admission'}</span>
        </button>
      </form>
    </div>
  );
}
