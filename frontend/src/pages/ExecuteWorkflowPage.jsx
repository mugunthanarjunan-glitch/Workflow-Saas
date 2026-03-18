import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getWorkflow, executeWorkflow } from '../services/api';

export default function ExecuteWorkflowPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getWorkflow(id);
        setWorkflow(data);
        // Pre-fill form from schema
        const initial = {};
        if (data.input_schema) {
          Object.keys(data.input_schema).forEach((key) => {
            initial[key] = '';
          });
        }
        setFormData(initial);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleChange = (key, value, type) => {
    setFormData({ ...formData, [key]: type === 'number' ? (value === '' ? '' : Number(value)) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setExecuting(true);
    setError('');
    try {
      const { data } = await executeWorkflow(id, formData);
      navigate(`/executions/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Execution failed');
      if (err.response?.data?.details) {
        setError(err.response.data.details.join(', '));
      }
    } finally {
      setExecuting(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!workflow) return <div className="empty-state">Workflow not found</div>;

  const schema = workflow.input_schema || {};

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/workflows" className="back-link">← Back</Link>
          <h1>Execute: {workflow.name}</h1>
        </div>
      </div>

      <div className="card execute-card">
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          {Object.keys(schema).length === 0 ? (
            <p className="text-muted">This workflow has no input schema. It will execute with empty data.</p>
          ) : (
            Object.entries(schema).map(([key, rules]) => (
              <div key={key} className="form-group">
                <label>
                  {key} {rules.required && <span className="required">*</span>}
                  <span className="field-type">({rules.type || 'string'})</span>
                </label>
                {rules.allowed_values ? (
                  <select
                    value={formData[key] || ''}
                    onChange={(e) => handleChange(key, e.target.value, rules.type)}
                    required={rules.required}
                  >
                    <option value="">Select...</option>
                    {rules.allowed_values.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={rules.type === 'number' ? 'number' : rules.type === 'date' ? 'date' : 'text'}
                    value={formData[key] ?? ''}
                    onChange={(e) => handleChange(key, e.target.value, rules.type)}
                    required={rules.required}
                    placeholder={`Enter ${key}`}
                  />
                )}
              </div>
            ))
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={executing}>
            {executing ? 'Executing...' : '▶ Execute Workflow'}
          </button>
        </form>
      </div>
    </div>
  );
}
