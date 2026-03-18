import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMyTasks, approveTask, rejectTask, startTask, completeTask } from '../services/api';

export default function TasksPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusFilter = searchParams.get('status') || '';
  const typeFilter = searchParams.get('type') || '';
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchTasks = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await getMyTasks(page, statusFilter, typeFilter);
      setTasks(data.tasks);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [statusFilter, typeFilter]);

  const setFilter = (status) => {
    const params = new URLSearchParams(searchParams);
    if (status) params.set('status', status);
    else params.delete('status');
    params.delete('page');
    navigate(`/tasks?${params.toString()}`);
  };

  const handleApprove = async (id) => {
    try { await approveTask(id); fetchTasks(); } catch (err) { alert('Failed to approve'); }
  };

  const handleReject = async (id) => {
    if (!confirm('Reject this task?')) return;
    try { await rejectTask(id); fetchTasks(); } catch (err) { alert('Failed to reject'); }
  };

  const handleStart = async (id) => {
    try { await startTask(id); fetchTasks(); } catch (err) { alert('Failed to start'); }
  };

  const handleComplete = async (id) => {
    try { await completeTask(id); fetchTasks(); } catch (err) { alert('Failed to complete'); }
  };

  const statusColor = (s) => {
    const map = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger', started: 'badge-primary', done: 'badge-success' };
    return map[s] || '';
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Tasks</h1>
      </div>

      <div className="filter-tabs">
        <button className={`tab-item ${!statusFilter ? 'active' : ''}`} onClick={() => setFilter('')}>All Tasks</button>
        <button className={`tab-item ${statusFilter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>New</button>
        <button className={`tab-item ${statusFilter === 'started' ? 'active' : ''}`} onClick={() => setFilter('started')}>In Progress</button>
        <button className={`tab-item ${statusFilter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
      </div>

      {loading ? (
        <div className="loading">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <h3>No tasks found</h3>
          <p>You have no tasks in this category.</p>
        </div>
      ) : (
        <>
          <div className="card-grid">
            {tasks.map((t) => (
              <div key={t._id} className="card task-card">
                <div className="card-header">
                  <h3>{t.step_id?.name || 'Task'}</h3>
                  <span className={`badge ${statusColor(t.status)}`}>{t.status}</span>
                </div>
                <div className="card-meta">
                  <span>Workflow: {t.execution_id?.workflow_id?.name || 'Unknown'}</span>
                  <span>Created: {new Date(t.createdAt).toLocaleString()}</span>
                </div>
                {t.execution_id?.data && (
                  <div className="task-data">
                    <strong>Execution Data:</strong>
                    <pre className="code-block code-sm">{JSON.stringify(t.execution_id.data, null, 2)}</pre>
                  </div>
                )}
                <div className="card-actions">
                  {t.step_id?.step_type === 'task' ? (
                    <>
                      {t.status === 'pending' && <button onClick={() => handleStart(t._id)} className="btn btn-sm btn-primary">Start Task</button>}
                      {t.status === 'started' && <button onClick={() => handleComplete(t._id)} className="btn btn-sm btn-success">Complete Task</button>}
                    </>
                  ) : (
                    <>
                      {t.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(t._id)} className="btn btn-sm btn-success">Approve</button>
                          <button onClick={() => handleReject(t._id)} className="btn btn-sm btn-danger">Reject</button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {pagination.pages > 1 && (
            <div className="pagination">
              {Array.from({ length: pagination.pages }, (_, i) => (
                <button key={i} className={`btn btn-sm ${pagination.page === i + 1 ? 'btn-primary' : ''}`} onClick={() => fetchTasks(i + 1)}>{i + 1}</button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
