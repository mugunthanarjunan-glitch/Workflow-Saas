import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getExecutions } from '../services/api';

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchExecutions = async (page = 1) => {
    setLoading(true);
    try {
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      const { data } = await getExecutions(page, filters);
      setExecutions(data.executions);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExecutions(); }, [statusFilter]);

  const statusColor = (s) => {
    const map = { completed: 'badge-success', in_progress: 'badge-warning', failed: 'badge-danger', canceled: 'badge-muted', pending: 'badge-info' };
    return map[s] || '';
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Executions</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading executions...</div>
      ) : executions.length === 0 ? (
        <div className="empty-state">
          <h3>No executions found</h3>
          <p>Execute a workflow to see results here.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Triggered By</th>
                  <th>Started</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((ex) => (
                  <tr key={ex._id}>
                    <td>{ex.workflow_id?.name || 'Unknown'}</td>
                    <td>v{ex.workflow_version}</td>
                    <td><span className={`badge ${statusColor(ex.status)}`}>{ex.status}</span></td>
                    <td>{ex.triggered_by?.name || 'Unknown'}</td>
                    <td>{new Date(ex.started_at).toLocaleString()}</td>
                    <td>
                      <Link to={`/executions/${ex._id}`} className="btn btn-xs">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.pages > 1 && (
            <div className="pagination">
              {Array.from({ length: pagination.pages }, (_, i) => (
                <button key={i} className={`btn btn-sm ${pagination.page === i + 1 ? 'btn-primary' : ''}`} onClick={() => fetchExecutions(i + 1)}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
