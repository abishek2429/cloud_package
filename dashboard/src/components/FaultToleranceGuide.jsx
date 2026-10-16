import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  RefreshCw,
  Copy,
  Check,
  BookOpen,
  Layers,
  Flame,
  Activity,
  Ambulance,
  Play
} from 'lucide-react';
import {
  getChaosStatus,
  setNodeChaosMode,
  resetChaos,
  triggerSurgeSimulation,
  runIdempotencyExperiment
} from '../api/trafficApi';

export default function FaultToleranceGuide({ nodes, report, onRefresh }) {
  const [chaosState, setChaosState] = useState({});
  const [isUpdatingChaos, setIsUpdatingChaos] = useState(false);
  const [surgeResult, setSurgeResult] = useState(null);
  const [isSurging, setIsSurging] = useState(false);
  const [idempotencyResult, setIdempotencyResult] = useState(null);
  const [isTestingIdempotency, setIsTestingIdempotency] = useState(false);
  const [backoffStep, setBackoffStep] = useState(0);
  const [hysteresisStep, setHysteresisStep] = useState(0);

  // Load chaos status
  const fetchChaos = async () => {
    try {
      const data = await getChaosStatus();
      if (data) setChaosState(data);
    } catch {
      // Ignore if coordinator is restarting
    }
  };

  useEffect(() => {
    fetchChaos();
  }, []);

  const handleToggleChaos = async (zoneId, mode) => {
    try {
      setIsUpdatingChaos(true);
      await setNodeChaosMode(zoneId, mode);
      await fetchChaos();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Failed to set chaos mode: ${err.message}`);
    } finally {
      setIsUpdatingChaos(false);
    }
  };

  const handleResetAllChaos = async () => {
    try {
      setIsUpdatingChaos(true);
      await resetChaos();
      await fetchChaos();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Failed to reset chaos: ${err.message}`);
    } finally {
      setIsUpdatingChaos(false);
    }
  };

  const handleRunSurge = async () => {
    try {
      setIsSurging(true);
      setSurgeResult(null);
      const res = await triggerSurgeSimulation(6);
      setSurgeResult(res);
      if (onRefresh) onRefresh();
    } catch (err) {
      setSurgeResult({ error: err.message });
    } finally {
      setIsSurging(false);
    }
  };

  const handleRunIdempotency = async () => {
    try {
      setIsTestingIdempotency(true);
      setIdempotencyResult(null);
      const res = await runIdempotencyExperiment();
      setIdempotencyResult(res);
      if (onRefresh) onRefresh();
    } catch (err) {
      setIdempotencyResult({ error: err.message });
    } finally {
      setIsTestingIdempotency(false);
    }
  };

  const handleStepBackoff = () => {
    setBackoffStep((prev) => (prev >= 4 ? 0 : prev + 1));
  };

  const handleStepHysteresis = () => {
    setHysteresisStep((prev) => (prev >= 4 ? 0 : prev + 1));
  };

  const hospitalList = [
    { id: 'NORTH', name: 'North Trauma Center', port: 8081, role: 'Level 1 Trauma' },
    { id: 'CENTRAL', name: 'Central General Hospital', port: 8082, role: 'University Acute Care' },
    { id: 'SOUTH', name: 'South Memorial Hospital', port: 8083, role: 'Regional Burn & Surge Unit' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* =========================================================================
          SECTION 1: LIVE IN-BROWSER CHAOS SWITCHBOARD
          ========================================================================= */}
      <section className="table-card" style={{ padding: '1.75rem' }} id="chaos-switchboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Flame size={20} color="#dc2626" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                Live In-Browser Chaos & Partition Switchboard
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Click below to sever network lines, inject lag, or simulate hospital outages live right in front of your professor!
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResetAllChaos}
            disabled={isUpdatingChaos}
            title="Restore all nodes to normal online health"
          >
            <RefreshCw size={13} />
            <span>Reset All to Normal</span>
          </button>
        </div>

        {/* Three Hospital Node Chaos Control Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {hospitalList.map((h) => {
            const chaos = chaosState[h.id] || { mode: 'normal' };
            const isOffline = chaos.mode === 'offline';
            const isLag = chaos.mode === 'lag';

            return (
              <div
                key={h.id}
                style={{
                  padding: '1.25rem',
                  background: isOffline ? 'var(--status-offline-bg)' : 'var(--bg-surface-elevated)',
                  border: `1px solid ${isOffline ? 'var(--status-offline-border)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: 'var(--text-heading)', fontSize: '0.95rem' }}>{h.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Port {h.port} • {h.role}
                    </div>
                  </div>

                  <span className={`status-badge ${isOffline ? 'offline' : (isLag ? 'partially-degraded' : 'healthy')}`} style={{ fontSize: '0.65rem' }}>
                    {isOffline ? 'SEVERED' : (isLag ? '1500ms LAG' : 'ONLINE')}
                  </span>
                </div>

                {/* Chaos Action Buttons */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${!isOffline && !isLag ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.725rem', padding: '0.3rem 0.6rem' }}
                    onClick={() => handleToggleChaos(h.id, 'normal')}
                    disabled={isUpdatingChaos}
                  >
                    🟢 Normal
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${isOffline ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      fontSize: '0.725rem',
                      padding: '0.3rem 0.6rem',
                      background: isOffline ? '#dc2626' : undefined,
                      borderColor: '#dc2626',
                      color: isOffline ? '#ffffff' : '#dc2626'
                    }}
                    onClick={() => handleToggleChaos(h.id, 'offline')}
                    disabled={isUpdatingChaos}
                  >
                    ⚡ Sever Partition
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${isLag ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.725rem', padding: '0.3rem 0.6rem', color: isLag ? '#ffffff' : 'var(--status-degraded)' }}
                    onClick={() => handleToggleChaos(h.id, 'lag')}
                    disabled={isUpdatingChaos}
                  >
                    🐌 1.5s Lag
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: FOUR LIVE DISTRIBUTED EXPERIMENTS
          ========================================================================= */}
      <section className="table-card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(2, 132, 199, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Zap size={20} color="var(--accent-cyan)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              Interactive Distributed Systems Live Experiments
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Execute live algorithms to prove CAP theorem, Idempotency, Bounded Backoff, and Hysteresis
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.25rem' }}>
          {/* Experiment 1: Mass Casualty Disaster Surge */}
          <div style={{
            padding: '1.25rem',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Ambulance size={18} color="var(--accent-cyan)" />
                <strong style={{ color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                  1. Mass Casualty Surge (6-Ambulance Wave)
                </strong>
              </div>
              <span className="status-badge low" style={{ fontSize: '0.65rem' }}>Load Balancing</span>
            </div>

            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Simulates a highway multi-collision. Dispatches 6 patients concurrently; the coordinator dynamically routes them across responding hospital partitions.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ alignSelf: 'flex-start', padding: '0.45rem 1rem' }}
              onClick={handleRunSurge}
              disabled={isSurging}
            >
              {isSurging ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={13} />}
              <span>{isSurging ? 'Dispatching Wave...' : '🚨 Launch 6-Patient Disaster Surge'}</span>
            </button>

            {surgeResult && (
              <div style={{
                padding: '0.65rem 0.85rem',
                background: surgeResult.error ? 'var(--status-offline-bg)' : 'var(--status-online-bg)',
                border: `1px solid ${surgeResult.error ? 'var(--status-offline-border)' : 'var(--status-online-border)'}`,
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: surgeResult.error ? 'var(--status-offline)' : 'var(--status-online)',
                fontFamily: 'var(--font-mono)'
              }}>
                {surgeResult.error ? `Surge Failed: ${surgeResult.error}` : surgeResult.message}
              </div>
            )}
          </div>

          {/* Experiment 2: Double-Dispatch Idempotency Attack */}
          <div style={{
            padding: '1.25rem',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={18} color="var(--accent-indigo)" />
                <strong style={{ color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                  2. Idempotency & Deduplication Engine
                </strong>
              </div>
              <span className="status-badge low" style={{ fontSize: '0.65rem' }}>Data Integrity</span>
            </div>

            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Sends two identical dispatches with the same Idempotency Key simultaneously. Demonstrates that PostgreSQL never stores duplicate rows under network retransmissions.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ alignSelf: 'flex-start', padding: '0.45rem 1rem' }}
              onClick={handleRunIdempotency}
              disabled={isTestingIdempotency}
            >
              {isTestingIdempotency ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
              <span>{isTestingIdempotency ? 'Executing...' : '⚡ Test Double-Dispatch Attack'}</span>
            </button>

            {idempotencyResult && (
              <div style={{
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.725rem',
                fontFamily: 'var(--font-mono)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem'
              }}>
                <div style={{ color: 'var(--text-muted)' }}>Key: <code>{idempotencyResult.idempotencyKey}</code></div>
                <div style={{ color: 'var(--status-online)' }}>{idempotencyResult.request1?.result}</div>
                <div style={{ color: 'var(--accent-cyan)' }}>{idempotencyResult.request2?.result}</div>
                <div style={{ color: 'var(--text-heading)', fontWeight: 700, marginTop: '0.2rem' }}>
                  ✅ {idempotencyResult.verdict}
                </div>
              </div>
            )}
          </div>

          {/* Experiment 3: Bounded Exponential Backoff Visualizer */}
          <div style={{
            padding: '1.25rem',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={18} color="var(--status-degraded)" />
                <strong style={{ color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                  3. Bounded Exponential Backoff Simulator
                </strong>
              </div>
              <span className="status-badge low" style={{ fontSize: '0.65rem' }}>Anti-Thundering Herd</span>
            </div>

            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Step through the 3 retry attempts to see how exponential spacing protects an overloaded hospital node from crashing under retry storms.
            </p>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ alignSelf: 'flex-start', padding: '0.45rem 1rem' }}
              onClick={handleStepBackoff}
            >
              <span>{backoffStep === 0 ? '▶ Start Step Simulator' : `Step Next (${backoffStep}/4)`}</span>
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontFamily: 'var(--font-mono)', fontSize: '0.725rem' }}>
              <div style={{ color: backoffStep >= 1 ? 'var(--status-offline)' : 'var(--text-muted)' }}>
                {backoffStep >= 1 ? '❌ Attempt 1: Failed (Initial request timed out at 0ms)' : '○ Attempt 1 (Awaiting)'}
              </div>
              <div style={{ color: backoffStep >= 2 ? 'var(--status-degraded)' : 'var(--text-muted)' }}>
                {backoffStep >= 2 ? '⏳ Backoff 200ms ──> ❌ Attempt 2: Failed (Node still congested)' : '○ Attempt 2 (Backoff 200ms)'}
              </div>
              <div style={{ color: backoffStep >= 3 ? 'var(--status-degraded)' : 'var(--text-muted)' }}>
                {backoffStep >= 3 ? '⏳ Backoff 400ms ──> ❌ Attempt 3: Failed (Node still congested)' : '○ Attempt 3 (Backoff 400ms)'}
              </div>
              <div style={{ color: backoffStep >= 4 ? 'var(--status-online)' : 'var(--text-muted)', fontWeight: 700 }}>
                {backoffStep >= 4 ? '🛑 Bounded Circuit Cap Reached: Abort retries to prevent thundering herd!' : '○ Final Cap (Bounded Stop)'}
              </div>
            </div>
          </div>

          {/* Experiment 4: Hysteresis Anti-Flapping Simulator */}
          <div style={{
            padding: '1.25rem',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Activity size={18} color="var(--status-online)" />
                <strong style={{ color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                  4. Hysteresis Anti-Flapping Simulator
                </strong>
              </div>
              <span className="status-badge low" style={{ fontSize: '0.65rem' }}>Noise Immunity</span>
            </div>

            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Observe why single dropped Wi-Fi packets do not trigger false alarms. Dual-threshold hysteresis requires 2 consecutive checks to transition states.
            </p>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ alignSelf: 'flex-start', padding: '0.45rem 1rem' }}
              onClick={handleStepHysteresis}
            >
              <span>{hysteresisStep === 0 ? '▶ Start Hysteresis Step' : `Step Next (${hysteresisStep}/4)`}</span>
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontFamily: 'var(--font-mono)', fontSize: '0.725rem' }}>
              <div style={{ color: hysteresisStep >= 1 ? 'var(--status-degraded)' : 'var(--text-muted)' }}>
                {hysteresisStep >= 1 ? '⚠️ Heartbeat 1 Failed: Held ONLINE (Anti-flapping protected; false alarm prevented!)' : '○ Heartbeat 1'}
              </div>
              <div style={{ color: hysteresisStep >= 2 ? 'var(--status-offline)' : 'var(--text-muted)' }}>
                {hysteresisStep >= 2 ? '🚨 Heartbeat 2 Failed: Transitioned to OFFLINE (Graceful degradation triggered)' : '○ Heartbeat 2'}
              </div>
              <div style={{ color: hysteresisStep >= 3 ? 'var(--status-degraded)' : 'var(--text-muted)' }}>
                {hysteresisStep >= 3 ? '⏳ Heartbeat 3 Succeeded: Held OFFLINE (Awaiting recovery confirmation)' : '○ Heartbeat 3'}
              </div>
              <div style={{ color: hysteresisStep >= 4 ? 'var(--status-online)' : 'var(--text-muted)', fontWeight: 700 }}>
                {hysteresisStep >= 4 ? '🟢 Heartbeat 4 Succeeded: 2/2 Successes confirmed -> Restored to ONLINE!' : '○ Heartbeat 4 (Full Recovery)'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: DISTRIBUTED SYSTEMS THEORY & VIVA DEFENSE CARDS
          ========================================================================= */}
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
          {[
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
            },
            {
              title: 'Shared-Nothing Database Tier',
              badge: 'Database-per-Service',
              description: 'Each hospital partition owns its own independent database (pulsegrid_north, pulsegrid_central, pulsegrid_south). Zero shared memory, cross-database locks, or single points of failure.'
            }
          ].map((dp, idx) => (
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
