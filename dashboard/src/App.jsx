import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import OverviewCards from './components/OverviewCards';
import TopologyDiagram from './components/TopologyDiagram';
import NodeCards from './components/NodeCards';
import IncidentTable from './components/IncidentTable';
import IncidentForm from './components/IncidentForm';
import ActivityLog from './components/ActivityLog';
import FaultToleranceGuide from './components/FaultToleranceGuide';
import DegradedBanner from './components/DegradedBanner';
import SettingsView from './components/SettingsView';
import { getCityReport, getNodeStatuses, subscribeActivity } from './api/trafficApi';
import { AlertCircle, RefreshCw, Plus, X } from 'lucide-react';

export default function App() {
  const [report, setReport] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(5000); // 5 seconds default
  const [activityLogs, setActivityLogs] = useState([]);

  // Multi-Page Tab Navigation state
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'incidents' | 'telemetry' | 'chaos' | 'settings'
  const [showReportForm, setShowReportForm] = useState(false);

  // Subscribe to real API activity events
  useEffect(() => {
    const unsubscribe = subscribeActivity((newEntry) => {
      setActivityLogs((prev) => [newEntry, ...prev.slice(0, 99)]); // retain latest 100 entries
    });
    return unsubscribe;
  }, []);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }

    try {
      // Concurrently query both city report and individual node telemetry
      const [reportData, nodesData] = await Promise.all([
        getCityReport(),
        getNodeStatuses().catch((err) => {
          console.warn('Node status endpoint failed, falling back to report node statuses', err);
          return null;
        }),
      ]);

      setReport(reportData);
      if (nodesData && Array.isArray(nodesData)) {
        setNodes(nodesData);
      } else if (reportData?.nodeStatuses) {
        setNodes(reportData.nodeStatuses);
      }

      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to sync with coordinator API', err);
      setError(err.message || 'Unable to connect to coordinator service');
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Periodic polling interval
  useEffect(() => {
    if (pollingInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchData(true);
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [pollingInterval, fetchData]);

  const handleIncidentSubmitted = (newIncident) => {
    fetchData(false);
    setShowReportForm(false);
  };

  const handleStatusUpdated = () => {
    fetchData(false);
  };

  const handleClearLogs = () => {
    setActivityLogs([]);
  };

  if (isInitialLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        color: 'var(--text-secondary)'
      }}>
        <RefreshCw size={36} color="var(--accent-cyan)" style={{ animation: 'spin 1s linear infinite' }} />
        <h3 style={{ color: 'var(--text-heading)', fontSize: '1.25rem' }}>
          Connecting to Distributed Incident Monitoring Cluster...
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Querying central coordinator API gateway
        </p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const incidentCount = report?.incidents?.length || 0;
  const logCount = activityLogs.length;

  return (
    <div className="app-container" id="dashboard-root-container">
      {/* 1. Header with Top Navigation Bar */}
      <Header
        systemStatus={report?.systemStatus || (error ? 'CRITICAL' : 'HEALTHY')}
        onRefresh={() => fetchData(false)}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        incidentCount={incidentCount}
        logCount={logCount}
      />

      {/* 2. Connection Error Banner (Shown on any tab if Coordinator is unreachable) */}
      {error && (
        <div className="degraded-banner critical" id="cluster-connection-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={24} style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--text-heading)' }}>Coordinator Communication Failure</strong>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.2rem' }}>{error}</p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => fetchData(false)}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* =========================================================================
          PAGE 1: OPERATIONS OVERVIEW
          ========================================================================= */}
      {activeTab === 'overview' && (
        <main className="tab-page-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <DegradedBanner report={report} />
          <OverviewCards report={report} nodes={nodes} />
          <TopologyDiagram nodes={nodes} systemStatus={report?.systemStatus} />
          <NodeCards nodes={nodes} report={report} />
        </main>
      )}

      {/* =========================================================================
          PAGE 2: INCIDENT COMMAND & REGISTER
          ========================================================================= */}
      {activeTab === 'incidents' && (
        <main className="tab-page-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Action Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1rem 1.5rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                Metropolitan Emergency Triage & Hospital Intake
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Filter, inspect, export, and route critical patients across North Trauma, Central General, and South Memorial
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                className={showReportForm ? 'btn btn-secondary' : 'btn btn-primary'}
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}
                onClick={() => setShowReportForm(!showReportForm)}
              >
                {showReportForm ? <X size={15} /> : <Plus size={15} />}
                <span>{showReportForm ? 'Close Dispatch Form' : '+ Dispatch Emergency Patient'}</span>
              </button>
            </div>
          </div>

          {/* Conditional Report Form Drawer */}
          {showReportForm && (
            <div style={{ animation: 'fadeIn 0.2s ease-in' }}>
              <IncidentForm onIncidentSubmitted={handleIncidentSubmitted} />
            </div>
          )}

          {/* Full-Width Uncongested Incident Register Table */}
          <IncidentTable
            incidents={report?.incidents || []}
            onStatusUpdated={handleStatusUpdated}
            isLoading={isLoading}
          />
        </main>
      )}

      {/* =========================================================================
          PAGE 3: LIVE TELEMETRY & HTTP STREAM
          ========================================================================= */}
      {activeTab === 'telemetry' && (
        <main className="tab-page-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ActivityLog logs={activityLogs} onClearLogs={handleClearLogs} />
        </main>
      )}

      {/* =========================================================================
          PAGE 4: FAULT TOLERANCE & CHAOS LAB
          ========================================================================= */}
      {activeTab === 'chaos' && (
        <main className="tab-page-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <FaultToleranceGuide nodes={nodes} report={report} />
        </main>
      )}

      {/* =========================================================================
          PAGE 5: CLUSTER SETTINGS & CONFIG
          ========================================================================= */}
      {activeTab === 'settings' && (
        <main className="tab-page-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SettingsView
            pollingInterval={pollingInterval}
            onPollingChange={setPollingInterval}
            lastUpdated={lastUpdated}
            onRefresh={() => fetchData(false)}
          />
        </main>
      )}

      {/* Clean Global Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '2.5rem 1rem 1.5rem',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)',
        marginTop: '2rem'
      }}>
        PulseGrid • Distributed Emergency Medical & Hospital Surge Network • Node.js 20 (ESM), Express.js, PostgreSQL 15, React 19, Docker Compose & Vercel
      </footer>
    </div>
  );
}
