import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getExecution, cancelExecution, retryExecution } from '../services/api';

export default function ExecutionDetailPage() {
  const { id } = useParams();
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchExecution = async () => {
    try {
      const { data } = await getExecution(id);
      setExecution(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExecution(); }, [id]);

  // Auto-refresh for in-progress executions
  useEffect(() => {
    if (execution?.status === 'in_progress' || execution?.status === 'pending') {
      const interval = setInterval(fetchExecution, 3000);
      return () => clearInterval(interval);
    }
  }, [execution?.status]);

  const handleCancel = async () => {
    if (!confirm('Cancel this execution?')) return;
    try {
      await cancelExecution(id);
      fetchExecution();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel');
    }
  };

  const handleRetry = async () => {
    try {
      const { data } = await retryExecution(id);
      window.location.href = `/executions/${data._id}`;
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to retry');
    }
  };

  const statusColor = (s) => {
    const map = { completed: 'badge-success', in_progress: 'badge-warning', failed: 'badge-danger', canceled: 'badge-muted', pending: 'badge-info' };
    return map[s] || '';
  };

  if (loading) return <div className="loading">Loading execution...</div>;
  if (!execution) return <div className="empty-state">Execution not found</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/executions" className="back-link">← Back to Executions</Link>
          <h1>Execution Detail</h1>
        </div>
        <div className="header-actions">
          {['in_progress', 'pending'].includes(execution.status) && (
            <button className="btn btn-sm btn-danger" onClick={handleCancel}>Cancel</button>
          )}
          {['failed', 'canceled'].includes(execution.status) && (
            <button className="btn btn-sm btn-accent" onClick={handleRetry}>Retry</button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="card">
          <h3>Overview</h3>
          <div className="detail-row"><span>Workflow</span><span>{execution.workflow_id?.name || 'Unknown'}</span></div>
          <div className="detail-row"><span>Version</span><span>v{execution.workflow_version}</span></div>
          <div className="detail-row"><span>Status</span><span className={`badge ${statusColor(execution.status)}`}>{execution.status}</span></div>
          <div className="detail-row"><span>Current Step</span><span>{execution.current_step_id?.name || '—'}</span></div>
          <div className="detail-row"><span>Triggered By</span><span>{execution.triggered_by?.name || 'Unknown'}</span></div>
          <div className="detail-row"><span>Started</span><span>{new Date(execution.started_at).toLocaleString()}</span></div>
          {execution.ended_at && <div className="detail-row"><span>Ended</span><span>{new Date(execution.ended_at).toLocaleString()}</span></div>}
        </div>

        <div className="card">
          <h3>Input Data</h3>
          <pre className="code-block">{JSON.stringify(execution.data, null, 2)}</pre>
        </div>
      </div>

      <div className="card">
        <h3>Execution Logs</h3>
        <div className="log-timeline">
          {execution.logs && execution.logs.length > 0 ? (
            execution.logs.map((log, i) => (
              <div key={i} className={`log-entry log-${log.status || 'info'}`}>
                <div className="log-marker"></div>
                <div className="log-content">
                  <div className="log-header">
                    <strong>{log.step_name}</strong>
                    <span className={`badge badge-sm ${statusColor(log.status)}`}>{log.action}</span>
                    {log.duration_ms !== undefined && <span className="log-duration">{log.duration_ms}ms</span>}
                  </div>
                  <p className="log-message">{log.message}</p>
                  {log.rules_evaluated && log.rules_evaluated.length > 0 && (
                    <div className="log-rules">
                      <span className="rules-label">Rules evaluated:</span>
                      {log.rules_evaluated.map((r, j) => (
                        <span key={j} className={`rule-eval ${r.result ? 'matched' : 'unmatched'}`}>
                          {r.condition}: {r.result ? '✓' : '✗'}
                        </span>
                      ))}
                    </div>
                  )}
                  {log.selected_next_step && (
                    <div className="log-next">→ Next: {log.selected_next_step.step_name || log.selected_next_step.step_id}</div>
                  )}
                  <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-hint">No logs yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
