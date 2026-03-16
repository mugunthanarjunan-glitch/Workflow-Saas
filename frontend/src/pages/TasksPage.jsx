import { useState, useEffect } from 'react';
import { getMyTasks, approveTask, rejectTask, startTask, completeTask } from '../services/api';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchTasks = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await getMyTasks(page);
      setTasks(data.tasks);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleApprove = async (id) => {
    try {
      await approveTask(id);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    if (!confirm('Reject this task? The workflow will be stopped.')) return;
    try {
      await rejectTask(id);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject');
    }
  };

  const handleStart = async (id) => {
    try {
      await startTask(id);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start');
    }
  };

  const handleComplete = async (id) => {
    try {
      await completeTask(id);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to complete');
    }
  };

  const statusColor = (s) => {
    const map = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger', started: 'badge-primary', done: 'badge-success' };
    return map[s] || '';
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Tasks</h1>
      </div>

      {loading ? (
        <div className="loading">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <h3>No tasks assigned</h3>
          <p>You have no pending approval tasks.</p>
        </div>
      ) : (
        <>
          <div className="card-grid">
            {tasks.map((t) => (
              <div key={t._id} className="card task-card">
                <div className="card-header">
                  <h3>{t.step_id?.name || 'Unknown Step'}</h3>
                  <span className={`badge ${statusColor(t.status)}`}>{t.status}</span>
                </div>
                <div className="card-meta">
                  <span>Type: {t.step_id?.step_type}</span>
                  <span>Created: {new Date(t.createdAt).toLocaleString()}</span>
                </div>
                {t.execution_id?.data && (
                  <div className="task-data">
                    <strong>Execution Data:</strong>
                    <pre className="code-block code-sm">{JSON.stringify(t.execution_id.data, null, 2)}</pre>
                  </div>
                )}
                {t.step_id?.step_type === 'task' ? (
                  <>
                    {t.status === 'pending' && (
                      <div className="card-actions">
                        <button onClick={() => handleStart(t._id)} className="btn btn-sm btn-primary"><i className="bi bi-play-fill"></i> Start Task</button>
                      </div>
                    )}
                    {t.status === 'started' && (
                      <div className="card-actions">
                        <button onClick={() => handleComplete(t._id)} className="btn btn-sm btn-success"><i className="bi bi-check-circle"></i> Complete Task</button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {t.status === 'pending' && (
                      <div className="card-actions">
                        <button onClick={() => handleApprove(t._id)} className="btn btn-sm btn-success"><i className="bi bi-check-lg"></i> Approve</button>
                        <button onClick={() => handleReject(t._id)} className="btn btn-sm btn-danger"><i className="bi bi-x-lg"></i> Reject</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          {pagination.pages > 1 && (
            <div className="pagination">
              {Array.from({ length: pagination.pages }, (_, i) => (
                <button key={i} className={`btn btn-sm ${pagination.page === i + 1 ? 'btn-primary' : ''}`} onClick={() => fetchTasks(i + 1)}>
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
