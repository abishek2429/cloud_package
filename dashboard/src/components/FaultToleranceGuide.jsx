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
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={20} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
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
            background: isSouthOffline ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${isSouthOffline ? 'var(--status-offline-border)' : 'var(--status-online-border)'}`,
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            color: isSouthOffline ? '#f87171' : 'var(--status-online)'
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
              background: hasSouthIncidents ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface-elevated)'
            }}>
              {hasSouthIncidents ? '✓' : '1'}
            </div>
            <div className="step-content" style={{ flex: 1 }}>
              <h5>Step 1: Ingest an Incident into South Zone</h5>
              <p>
                Navigate to the <strong>Incidents Command</strong> tab and report a test incident targeting <strong>SOUTH</strong> (or use the ⚡ Seed All 3 Zones button). The record is committed directly to PostgreSQL.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="demo-step" style={{ padding: '0.85rem 0' }}>
            <div className="step-num" style={{
              borderColor: isSouthOffline ? 'var(--status-offline)' : 'var(--border-medium)',
              color: isSouthOffline ? 'var(--status-offline)' : 'var(--text-muted)',
              background: isSouthOffline ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-surface-elevated)'
            }}>
              {isSouthOffline ? '✓' : '2'}
            </div>
            <div className="step-content" style={{ flex: 1 }}>
              <h5>Step 2: Simulate Node Failure (Stop South Zone)</h5>
              <p>
                Run this command in PowerShell or terminal to trigger an abrupt container partition crash:
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <span className="code-snippet">docker compose stop zone-south</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyToClipboard('docker compose stop zone-south', 'cmd-stop')}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.725rem' }}
                >
                  {copiedCmd === 'cmd-stop' ? <Check size={12} color="var(--status-online)" /> : <Copy size={12} />}
                  <span>{copiedCmd === 'cmd-stop' ? 'Copied' : 'Copy Command'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="demo-step" style={{ padding: '0.85rem 0' }}>
            <div className="step-num" style={{
              borderColor: isSouthOffline ? 'var(--status-degraded)' : 'var(--border-medium)',
              color: isSouthOffline ? 'var(--status-degraded)' : 'var(--text-muted)'
            }}>
              {isSouthOffline ? '✓' : '3'}
            </div>
            <div className="step-content" style={{ flex: 1 }}>
              <h5>Step 3: Observe Hysteresis & Partial Degradation</h5>
              <p>
                After 2 consecutive failed health probes (10s), the system marks South as <strong>OFFLINE</strong> and the system status transitions to <strong style={{ color: 'var(--status-degraded)' }}>PARTIALLY_DEGRADED</strong>. <strong>North and Central continue serving live incidents with zero failure!</strong>
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="demo-step" style={{ padding: '0.85rem 0' }}>
            <div className="step-num">4</div>
            <div className="step-content" style={{ flex: 1 }}>
              <h5>Step 4: Restart Container & Verify Zero Data Loss</h5>
              <p>
                Start the South container back up. Once 2 consecutive healthy pings pass, South automatically re-joins the scatter-gather pool and all previous incidents load seamlessly from PostgreSQL:
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <span className="code-snippet">docker compose start zone-south</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyToClipboard('docker compose start zone-south', 'cmd-start')}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.725rem' }}
                >
                  {copiedCmd === 'cmd-start' ? <Check size={12} color="var(--status-online)" /> : <Copy size={12} />}
                  <span>{copiedCmd === 'cmd-start' ? 'Copied' : 'Copy Command'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Viva Defense & Distributed Principles Cards */}
      <section className="table-card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={20} color="var(--accent-indigo)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
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
                <strong style={{ color: '#fff', fontSize: '0.875rem' }}>{dp.title}</strong>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(6, 182, 212, 0.12)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
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
