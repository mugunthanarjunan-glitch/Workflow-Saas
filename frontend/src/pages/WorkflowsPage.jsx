import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWorkflows, deleteWorkflow, createWorkflow, createFinancialWorkflow } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function WorkflowsPage() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const fetchWorkflows = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await getWorkflows(page);
      setWorkflows(data.workflows);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createWorkflow(form);
      setForm({ name: '', description: '' });
      setShowCreate(false);
      fetchWorkflows();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create workflow');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      await deleteWorkflow(id);
      fetchWorkflows();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Workflows</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={async () => {
            if (confirm('Create Financial Preset?')) {
              try {
                await createFinancialWorkflow({ name: 'Financial Approval Workflow' });
                fetchWorkflows();
              } catch (err) {
                alert('Failed');
              }
            }
          }}>
            <i className="bi bi-currency-dollar"></i> Preset
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : <><i className="bi bi-plus-lg"></i> New Workflow</>}
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="card create-card" style={{ marginBottom: '20px' }}>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Create</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading workflows...</div>
      ) : workflows.length === 0 ? (
        <div className="empty-state">
          <h3>No workflows yet</h3>
          <p>Create your first workflow to get started.</p>
        </div>
      ) : (
        <>
          <div className="card-grid">
            {workflows.map((w) => (
              <div key={w._id} className="card workflow-card">
                <div className="card-header">
                  <h3>{w.name}</h3>
                  <span className={`badge ${w.is_active ? 'badge-success' : 'badge-muted'}`}>{w.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="card-desc">{w.description || 'No description'}</p>
                <div className="card-meta">
                  <span>v{w.version}</span>
                  <span>by {w.created_by?.name || 'Unknown'}</span>
                </div>
                <div className="card-actions">
                  <Link to={`/workflows/${w._id}`} className="btn btn-sm">Edit</Link>
                  <Link to={`/workflows/${w._id}/execute`} className="btn btn-sm btn-accent">Execute</Link>
                  <button onClick={() => handleDelete(w._id)} className="btn btn-sm btn-danger">Delete</button>
                </div>
              </div>
            ))}
          </div>
          {pagination.pages > 1 && (
            <div className="pagination">
              {Array.from({ length: pagination.pages }, (_, i) => (
                <button
                  key={i}
                  className={`btn btn-sm ${pagination.page === i + 1 ? 'btn-primary' : ''}`}
                  onClick={() => fetchWorkflows(i + 1)}
                >
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
