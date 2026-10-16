import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, Terminal, ExternalLink, RefreshCw, AlertTriangle, CheckCircle2, BookOpen, Layers } from 'lucide-react';

export default function FaultToleranceGuide({ nodes, report }) {
  const [copiedCmd, setCopiedCmd] = useState(null);

  const southNode = nodes?.find(n => n.zoneId?.toUpperCase() === 'SOUTH');
  const isSouthOffline = southNode?.status === 'OFFLINE' || report?.unavailableZones?.includes('SOUTH');
  const hasSouthIncidents = (report?.incidents || []).some(i => i.zoneId?.toUpperCase() === 'SOUTH');

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const distributedPrinciples = [
    {
      title: 'CAP Theorem & Partition Tolerance',
      badge: 'AP Focus',
      description: 'When network partitions sever Zone South, the system prioritizes Availability (North and Central remain 100% operational) over global consistency.'
    },
    {
      title: 'Hysteresis State Machine',
      badge: 'Anti-Flapping',
      description: 'Transient latency glitches do not trigger false alarms. Requires 2 consecutive failures to mark OFFLINE, and 2 consecutive successes to restore ONLINE.'
    },
    {
      title: 'Bounded Exponential Backoff',
      badge: 'Thundering Herd Defense',
      description: 'Retry Executor caps ingestion at 3 bounded attempts with exponential backoff (200ms -> 400ms -> 800ms) rather than hammering degraded nodes.'
    },
    {
      title: 'Idempotency & Deduplication',
      badge: 'Data Integrity',
      description: 'Client idempotency keys and deterministic ticket hashes ensure network retries never produce duplicate database rows.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* 1. Interactive Demonstration Walkthrough */}
      <section className="table-card" style={{ padding: '1.75rem' }} id="fault-tolerance-guide-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(2, 132, 199, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={20} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                Resilience & Partition Crash Demonstration
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Step-by-step instructions to demonstrate graceful degradation and durable PostgreSQL recovery
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.8rem',
            background: isSouthOffline ? 'var(--status-offline-bg)' : 'var(--status-online-bg)',
            border: `1px solid ${isSouthOffline ? 'var(--status-offline-border)' : 'var(--status-online-border)'}`,
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            color: isSouthOffline ? 'var(--status-offline)' : 'var(--status-online)'
          }}>
            <span className="pulsing-dot" />
            <span>South Status: <strong>{isSouthOffline ? 'PARTITION OFFLINE' : 'ONLINE (READY)'}</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Step 1 */}
          <div className="demo-step" style={{ padding: '0.85rem 0' }}>
            <div className="step-num" style={{
              borderColor: hasSouthIncidents ? 'var(--status-online)' : 'var(--accent-cyan)',
              color: hasSouthIncidents ? 'var(--status-online)' : 'var(--accent-cyan)',
              background: hasSouthIncidents ? 'rgba(5, 150, 105, 0.1)' : 'var(--bg-surface-elevated)'
            }}>
              {hasSouthIncidents ? <Check size={14} /> : '1'}
            </div>
            <div className="step-content" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h5>Step 1: Dispatch Emergency Patients to South Hospital</h5>
                <span className="status-badge low" style={{ fontSize: '0.65rem' }}>Prerequisite</span>
              </div>
              <p>
                Navigate to <strong>Emergency Triage</strong> and dispatch a trauma patient to South Memorial Hospital. This verifies that PostgreSQL has saved an initial baseline record.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="demo-step" style={{ padding: '0.85rem 0' }}>
            <div className="step-num" style={{
              borderColor: isSouthOffline ? 'var(--status-offline)' : 'var(--accent-cyan)',
              color: isSouthOffline ? 'var(--status-offline)' : 'var(--accent-cyan)',
              background: isSouthOffline ? 'rgba(220, 38, 38, 0.1)' : 'var(--bg-surface-elevated)'
            }}>
              {isSouthOffline ? <AlertTriangle size={14} /> : '2'}
            </div>
            <div className="step-content" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h5>Step 2: Simulate Outage / Crash South Hospital Node</h5>
                <span className={`status-badge ${isSouthOffline ? 'offline' : 'medium'}`} style={{ fontSize: '0.65rem' }}>
                  {isSouthOffline ? 'Partition Active' : 'Action Required'}
                </span>
              </div>
              <p>
                In your terminal, stop the South container to simulate a fiber cut or network partition:
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                <code className="code-snippet">docker stop zone-south</code>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  onClick={() => copyToClipboard('docker stop zone-south', 'step2')}
                >
                  {copiedCmd === 'step2' ? <Check size={12} color="var(--status-online)" /> : <Copy size={12} />}
                  <span>{copiedCmd === 'step2' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <em>What happens:</em> Coordinator requires <strong>2 consecutive probe timeouts</strong> before flipping South to OFFLINE (hysteresis defense against flappy networks).
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="demo-step" style={{ padding: '0.85rem 0' }}>
            <div className="step-num">3</div>
            <div className="step-content" style={{ flex: 1 }}>
              <h5>Step 3: Observe Graceful Degradation in Coordinator</h5>
              <p>
                Notice the status flips from <code>HEALTHY</code> to <code>PARTIALLY_DEGRADED</code>. The system does <strong>not crash</strong>: North Trauma and Central General continue accepting admissions without interruption.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="demo-step" style={{ padding: '0.85rem 0' }}>
            <div className="step-num">4</div>
            <div className="step-content" style={{ flex: 1 }}>
              <h5>Step 4: Restore South Hospital Node</h5>
              <p>
                Restart the stopped hospital partition container:
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                <code className="code-snippet">docker start zone-south</code>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  onClick={() => copyToClipboard('docker start zone-south', 'step4')}
                >
                  {copiedCmd === 'step4' ? <Check size={12} color="var(--status-online)" /> : <Copy size={12} />}
                  <span>{copiedCmd === 'step4' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <em>Durable Persistence:</em> All patient admission records survive intact from PostgreSQL, and South returns to ONLINE upon 2 successful health probes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Distributed Systems Theory & Viva Defense Cards */}
      <section className="table-card" style={{ padding: '1.75rem' }}>
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
            <BookOpen size={20} color="var(--accent-indigo)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              Distributed Systems Theory & Viva Defense
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Core architectural patterns implemented to satisfy distributed fault-tolerance requirements
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {distributedPrinciples.map((dp, idx) => (
            <div
              key={idx}
              style={{
                padding: '1.1rem',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: 'var(--text-heading)', fontSize: '0.875rem' }}>{dp.title}</strong>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(2, 132, 199, 0.1)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  fontWeight: 600
                }}>
                  {dp.badge}
                </span>
              </div>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {dp.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
