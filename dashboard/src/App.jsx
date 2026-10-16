import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import OverviewCards from './components/OverviewCards';
import TopologyDiagram from './components/TopologyDiagram';
import NodeCards from './components/NodeCards';
import IncidentTable from './components/IncidentTable';
import IncidentForm from './components/IncidentForm';
import ActivityLog from './components/ActivityLog';
import FaultToleranceGuide from './components/FaultToleranceGuide';
import DegradedBanner from './components/DegradedBanner';
import { getCityReport, getNodeStatuses, subscribeActivity } from './api/trafficApi';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [report, setReport] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(5000); // 5 seconds default
  const [activityLogs, setActivityLogs] = useState([]);

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
        getNodeStatuses().catch(err => {
          console.warn('Node status endpoint failed, falling back to report node statuses', err);
          return null;
        })
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
    // Immediately refresh data
    fetchData(false);
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
        <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>
          Connecting to Distributed Incident Monitoring Cluster...
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Querying central coordinator on port 8080
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

  return (
    <div className="app-container" id="dashboard-root-container">
      {/* 1. Header Navigation & Controls */}
      <Header
        systemStatus={report?.systemStatus || (error ? 'CRITICAL' : 'HEALTHY')}
        onRefresh={() => fetchData(false)}
        isLoading={isLoading}
        pollingInterval={pollingInterval}
        onPollingChange={setPollingInterval}
        lastUpdated={lastUpdated}
      />

      {/* 2. Error / Degradation Alert Banners */}
      {error && (
        <div className="degraded-banner critical" id="cluster-connection-error">
          <AlertCircle size={24} style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#fff' }}>Coordinator Communication Failure</strong>
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

      <DegradedBanner report={report} />

      {/* 3. High-Level Metric Cards */}
      <OverviewCards report={report} nodes={nodes} />

      {/* 4. Architecture Topology & Live Flow Diagram */}
      <TopologyDiagram nodes={nodes} systemStatus={report?.systemStatus} />

      {/* 5. Three Partition Node Cards (North, Central, South) */}
      <NodeCards nodes={nodes} report={report} />

      {/* 6. Two-Column Workspace */}
      <div className="two-column-layout">
        {/* Left Column: Incidents Table */}
        <IncidentTable
          incidents={report?.incidents || []}
          onStatusUpdated={handleStatusUpdated}
          isLoading={isLoading}
        />

        {/* Right Column: Submission Form & Activity Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <IncidentForm onIncidentSubmitted={handleIncidentSubmitted} />
          <ActivityLog logs={activityLogs} onClearLogs={handleClearLogs} />
        </div>
      </div>

      {/* 7. Visible Demonstration & Viva Checklist */}
      <FaultToleranceGuide nodes={nodes} report={report} />

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '2rem 1rem 1.5rem',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)'
      }}>
        Distributed Traffic Incident Monitoring System • Node.js 20 (ESM), Express.js, PostgreSQL 15, React 19, Docker Compose & Vercel
      </footer>
    </div>
  );
}
