import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, Terminal, ExternalLink, RefreshCw } from 'lucide-react';

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

  return (
    <section className="demo-checklist-card" id="fault-tolerance-guide-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldCheck size={22} color="var(--accent-cyan)" />
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
              Fault-Tolerance & Recovery Demonstration Workflow
            </h4>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Follow these steps in a PowerShell terminal to demonstrate resilient partition degradation and durable recovery.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Step 1 */}
        <div className="demo-step">
          <div className="step-num" style={{ borderColor: hasSouthIncidents ? 'var(--status-online)' : 'var(--accent-cyan)', color: hasSouthIncidents ? 'var(--status-online)' : 'var(--accent-cyan)' }}>
            {hasSouthIncidents ? '✓' : '1'}
          </div>
          <div className="step-content" style={{ flex: 1 }}>
            <h5>Step 1: Create an Incident in South Zone</h5>
            <p>
              Use the "Report Incident" form to submit an incident to <strong>SOUTH</strong>. It is durably stored in PostgreSQL.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="demo-step">
          <div className="step-num" style={{ borderColor: isSouthOffline ? 'var(--status-offline)' : 'var(--border-medium)', color: isSouthOffline ? 'var(--status-offline)' : 'var(--text-muted)' }}>
            {isSouthOffline ? '✓' : '2'}
          </div>
          <div className="step-content" style={{ flex: 1 }}>
            <h5>Step 2: Stop the South Zone Container</h5>
            <p>
              Run this command in a PowerShell terminal to simulate an unexpected node partition crash:
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
              <span className="code-snippet">docker compose stop zone-south</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => copyToClipboard('docker compose stop zone-south', 'cmd-stop')}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              >
                {copiedCmd === 'cmd-stop' ? <Check size={12} color="var(--status-online)" /> : <Copy size={12} />}
                <span>{copiedCmd === 'cmd-stop' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="demo-step">
          <div className="step-num" style={{ borderColor: isSouthOffline ? 'var(--status-degraded)' : 'var(--border-medium)', color: isSouthOffline ? 'var(--status-degraded)' : 'var(--text-muted)' }}>
            {isSouthOffline ? '✓' : '3'}
          </div>
          <div className="step-content" style={{ flex: 1 }}>
            <h5>Step 3: Observe Failure & Partial Degradation</h5>
            <p>
              Notice the system transitions to <strong style={{ color: 'var(--status-degraded)' }}>PARTIALLY_DEGRADED</strong>. 
              The South card turns <span style={{ color: 'var(--status-offline)', fontWeight: 600 }}>OFFLINE</span>, while North and Central continue serving requests.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="demo-step">
          <div className="step-num">4</div>
          <div className="step-content" style={{ flex: 1 }}>
            <h5>Step 4: Restart Container & Confirm Durable Recovery</h5>
            <p>
              Start the container again. Once the health probe passes, communication automatically resumes and previous runtime incidents remain available from PostgreSQL!
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
              <span className="code-snippet">docker compose start zone-south</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => copyToClipboard('docker compose start zone-south', 'cmd-start')}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              >
                {copiedCmd === 'cmd-start' ? <Check size={12} color="var(--status-online)" /> : <Copy size={12} />}
                <span>{copiedCmd === 'cmd-start' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
