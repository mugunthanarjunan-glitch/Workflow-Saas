import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getWorkflow, updateWorkflow, getSteps, createStep, updateStep, deleteStep,
  getRules, createRule, updateRule, deleteRule, getUsers
} from '../services/api';

export default function WorkflowEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [steps, setSteps] = useState([]);
  const [selectedStep, setSelectedStep] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingWf, setEditingWf] = useState(false);
  const [wfForm, setWfForm] = useState({ name: '', description: '' });
  const [schemaFields, setSchemaFields] = useState([]);
  const [stepForm, setStepForm] = useState({ name: '', step_type: 'task', order: 0, assigned_to: '', task_description: '', notification_channel: 'email', notification_message: '' });
  const [showStepForm, setShowStepForm] = useState(false);
  const [ruleForm, setRuleForm] = useState({ type: 'conditional', condition: '', next_step_id: '', priority: 1 });
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: wf } = await getWorkflow(id);
      setWorkflow(wf);
      setWfForm({ name: wf.name, description: wf.description });
      // Convert JSON schema to fields array
      const fields = [];
      if (wf.input_schema && typeof wf.input_schema === 'object') {
        Object.entries(wf.input_schema).forEach(([key, val]) => {
          fields.push({
            name: key,
            type: val.type || 'string',
            required: val.required || false,
            allowed_values: val.allowed_values ? val.allowed_values.join(', ') : '',
          });
        });
      }
      setSchemaFields(fields);
      const { data: s } = await getSteps(id);
      setSteps(s);
      // Fetch users for assignment dropdowns
      try {
        const { data: u } = await getUsers();
        setUsers(u);
      } catch (userErr) {
        console.warn('Could not load users:', userErr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const fetchRules = async (stepId) => {
    try {
      const { data } = await getRules(stepId);
      setRules(data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectStep = (step) => {
    setSelectedStep(step);
    fetchRules(step._id);
    setShowRuleForm(false);
  };

  const addSchemaField = () => {
    setSchemaFields([...schemaFields, { name: '', type: 'string', required: false, allowed_values: '' }]);
  };

  const updateSchemaField = (index, key, value) => {
    const updated = [...schemaFields];
    updated[index] = { ...updated[index], [key]: value };
    setSchemaFields(updated);
  };

  const removeSchemaField = (index) => {
    setSchemaFields(schemaFields.filter((_, i) => i !== index));
  };

  const buildSchemaJSON = () => {
    const schema = {};
    schemaFields.forEach((f) => {
      if (!f.name.trim()) return;
      const entry = { type: f.type, required: f.required };
      if (f.allowed_values.trim()) {
        entry.allowed_values = f.allowed_values.split(',').map((v) => v.trim()).filter(Boolean);
      }
      schema[f.name.trim()] = entry;
    });
    return schema;
  };

  const handleUpdateWorkflow = async (e) => {
    e.preventDefault();
    try {
      const schema = buildSchemaJSON();
      await updateWorkflow(id, { name: wfForm.name, description: wfForm.description, input_schema: schema });
      setEditingWf(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Update failed');
    }
  };

  const handleSetStartStep = async (stepId) => {
    try {
      await updateWorkflow(id, { start_step_id: stepId });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to set start step');
    }
  };

  const buildMetadata = () => {
    if (stepForm.step_type === 'task' || stepForm.step_type === 'approval') {
      const meta = {};
      if (stepForm.assigned_to) meta.assigned_to = stepForm.assigned_to;
      if (stepForm.task_description) meta.description = stepForm.task_description;
      return meta;
    }
    if (stepForm.step_type === 'notification') {
      return {
        notification_channel: stepForm.notification_channel,
        message: stepForm.notification_message,
      };
    }
    return {};
  };

  const handleCreateStep = async (e) => {
    e.preventDefault();
    try {
      const metadata = buildMetadata();
      await createStep(id, { name: stepForm.name, step_type: stepForm.step_type, order: Number(stepForm.order), metadata });
      setStepForm({ name: '', step_type: 'task', order: steps.length, assigned_to: '', task_description: '', notification_channel: 'email', notification_message: '' });
      setShowStepForm(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create step');
    }
  };

  const handleDeleteStep = async (stepId) => {
    if (!confirm('Delete this step and its rules?')) return;
    try {
      await deleteStep(stepId);
      if (selectedStep?._id === stepId) { setSelectedStep(null); setRules([]); }
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete step');
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        condition: ruleForm.type === 'always' ? 'DEFAULT' : ruleForm.condition,
        next_step_id: ruleForm.next_step_id || null,
        priority: Number(ruleForm.priority),
      };
      await createRule(selectedStep._id, payload);
      setRuleForm({ type: 'conditional', condition: '', next_step_id: '', priority: rules.length + 2 });
      setShowRuleForm(false);
      fetchRules(selectedStep._id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await deleteRule(ruleId);
      fetchRules(selectedStep._id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete rule');
    }
  };

  if (loading) return <div className="loading">Loading workflow...</div>;
  if (!workflow) return <div className="empty-state">Workflow not found</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/workflows" className="back-link">← Back to Workflows</Link>
          <h1>{workflow.name} <span className="version-tag">v{workflow.version}</span></h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-sm" onClick={() => setEditingWf(!editingWf)}>
            {editingWf ? 'Cancel' : <><i className="bi bi-pencil-fill" style={{ marginRight: '6px' }}></i>Edit Details</>}
          </button>
          <Link to={`/workflows/${id}/execute`} className="btn btn-sm btn-accent"><i className="bi bi-play-fill" style={{ marginRight: '4px' }}></i>Execute</Link>
        </div>
      </div>

      {editingWf && (
        <div className="card">
          <form onSubmit={handleUpdateWorkflow}>
            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input value={wfForm.name} onChange={(e) => setWfForm({ ...wfForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={wfForm.description} onChange={(e) => setWfForm({ ...wfForm, description: e.target.value })} />
              </div>
            </div>
            <div className="schema-builder">
              <div className="schema-builder-header">
                <label>Input Schema Fields</label>
                <button type="button" className="btn btn-xs btn-primary" onClick={addSchemaField}>+ Add Field</button>
              </div>
              {schemaFields.length === 0 && (
                <div className="empty-hint">No input fields. Click "+ Add Field" to define what data this workflow needs.</div>
              )}
              {schemaFields.map((field, idx) => (
                <div key={idx} className="schema-field-row">
                  <div className="form-group">
                    <label>Field Name</label>
                    <input
                      placeholder="e.g. amount"
                      value={field.name}
                      onChange={(e) => updateSchemaField(idx, 'name', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select value={field.type} onChange={(e) => updateSchemaField(idx, 'type', e.target.value)}>
                      <option value="string">String</option>
                      <option value="number">Number</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Allowed Values</label>
                    <input
                      placeholder="comma-separated (optional)"
                      value={field.allowed_values}
                      onChange={(e) => updateSchemaField(idx, 'allowed_values', e.target.value)}
                    />
                  </div>
                  <div className="schema-field-toggles">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateSchemaField(idx, 'required', e.target.checked)}
                      />
                      <span>Required</span>
                    </label>
                    <button type="button" className="btn btn-xs btn-danger" onClick={() => removeSchemaField(idx)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </form>
        </div>
      )}

      <div className="editor-layout">
        {/* Steps Panel */}
        <div className="panel">
          <div className="panel-header">
            <h2>Steps</h2>
            <button className="btn btn-sm btn-primary" onClick={() => { setShowStepForm(!showStepForm); setStepForm({ ...stepForm, order: steps.length }); }}>
              {showStepForm ? 'Cancel' : '+ Add Step'}
            </button>
          </div>

          {showStepForm && (
            <form onSubmit={handleCreateStep} className="step-create-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Step Name</label>
                  <input placeholder="e.g. Manager Approval" value={stepForm.name} onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={stepForm.step_type} onChange={(e) => setStepForm({ ...stepForm, step_type: e.target.value })}>
                    <option value="task">Task</option>
                    <option value="approval">Approval</option>
                    <option value="notification">Notification</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Order</label>
                  <input type="number" value={stepForm.order} onChange={(e) => setStepForm({ ...stepForm, order: e.target.value })} />
                </div>
              </div>

              {(stepForm.step_type === 'task' || stepForm.step_type === 'approval') && (
                <div className="metadata-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Assign to User</label>
                      <input 
                        type="text" 
                        placeholder="Search by name, role, or email..." 
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        style={{ marginBottom: '8px' }}
                      />
                      <select value={stepForm.assigned_to} onChange={(e) => setStepForm({ ...stepForm, assigned_to: e.target.value })}>
                        <option value="">{stepForm.step_type === 'task' ? '— No assignment (auto) —' : '— Select a user —'}</option>
                        {users
                          .filter(u => `${u.name} ${u.role} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase()))
                          .map((u) => (
                          <option key={u._id} value={u._id}>{u.name} ({u.role.toUpperCase()}) — {u.email}</option>
                        ))}
                      </select>
                      {userSearch && users.filter(u => `${u.name} ${u.role} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())).length === 0 && (
                        <span className="field-hint">No users found matching "{userSearch}"</span>
                      )}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Description</label>
                      <input
                        placeholder={stepForm.step_type === 'approval' ? 'e.g. Approve the expense report before processing' : 'e.g. Review and verify the submitted documents'}
                        value={stepForm.task_description}
                        onChange={(e) => setStepForm({ ...stepForm, task_description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {stepForm.step_type === 'notification' && (
                <div className="form-row metadata-fields">
                  <div className="form-group">
                    <label>Message</label>
                    <input placeholder="e.g. Your request has been approved" value={stepForm.notification_message} onChange={(e) => setStepForm({ ...stepForm, notification_message: e.target.value })} />
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-sm btn-primary">Add Step</button>
            </form>
          )}

          <div className="step-list">
            {steps.map((s) => (
              <div
                key={s._id}
                className={`step-item ${selectedStep?._id === s._id ? 'selected' : ''} ${workflow.start_step_id === s._id ? 'start-step' : ''}`}
                onClick={() => selectStep(s)}
              >
                <div className="step-info">
                  <span className={`step-type-badge ${s.step_type}`}>
                    {s.step_type === 'task' && <i className="bi bi-tools" style={{ marginRight: '6px' }}></i>}
                    {s.step_type === 'approval' && <i className="bi bi-check2-circle" style={{ marginRight: '6px' }}></i>}
                    {s.step_type === 'notification' && <i className="bi bi-envelope-fill" style={{ marginRight: '6px' }}></i>}
                    {s.step_type.toUpperCase()}
                  </span>
                  <span className="step-name">{s.name}</span>
                  {workflow.start_step_id === s._id && <span className="badge badge-accent">START</span>}
                </div>
                <div className="step-actions">
                  <button className="btn btn-xs" onClick={(e) => { e.stopPropagation(); handleSetStartStep(s._id); }} title="Set as start step"><i className="bi bi-bullseye"></i></button>
                  <button className="btn btn-xs btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteStep(s._id); }} title="Delete step"><i className="bi bi-trash"></i></button>
                </div>
              </div>
            ))}
            {steps.length === 0 && <div className="empty-hint">No steps yet. Add your first step above.</div>}
          </div>
        </div>

        {/* Rules Panel */}
        <div className="panel">
          <div className="panel-header">
            <h2>Rules {selectedStep ? `— ${selectedStep.name}` : ''}</h2>
            {selectedStep && (
              <button className="btn btn-sm btn-primary" onClick={() => { setShowRuleForm(!showRuleForm); setRuleForm({ ...ruleForm, priority: rules.length + 1 }); }}>
                {showRuleForm ? 'Cancel' : <><i className="bi bi-plus-lg" style={{marginRight: '6px'}}></i>Add Rule</>}
              </button>
            )}
          </div>

          {!selectedStep ? (
            <div className="empty-hint">Select a step to view/add rules.</div>
          ) : (
            <>
              {showRuleForm && (
                <form onSubmit={handleCreateRule} className="rule-create-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Rule Type</label>
                      <select value={ruleForm.type} onChange={(e) => setRuleForm({ ...ruleForm, type: e.target.value })}>
                        <option value="conditional">Conditional (e.g. status == 'done')</option>
                        <option value="always">Always / Default (Fallback)</option>
                      </select>
                    </div>
                    {ruleForm.type === 'conditional' && (
                      <div className="form-group">
                        <label>Condition</label>
                        <input placeholder="e.g. amount > 100" value={ruleForm.condition} onChange={(e) => setRuleForm({ ...ruleForm, condition: e.target.value })} required />
                      </div>
                    )}
                    <div className="form-group">
                      <label>Next Step</label>
                      <select value={ruleForm.next_step_id} onChange={(e) => setRuleForm({ ...ruleForm, next_step_id: e.target.value })}>
                        <option value="">— End Workflow —</option>
                        {steps.filter(s => s._id !== selectedStep._id).map(s => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ maxWidth: '100px' }}>
                      <label>Priority</label>
                      <input type="number" placeholder="Priority" value={ruleForm.priority} onChange={(e) => setRuleForm({ ...ruleForm, priority: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-sm btn-primary" style={{ marginTop: '16px' }}>Add Rule</button>
                </form>
              )}

              <div className="rules-list">
                {rules.map((r) => (
                  <div key={r._id} className="rule-item">
                    <div className="rule-priority">P{r.priority}</div>
                    <div className="rule-details">
                      <code className="rule-condition">{r.condition === 'DEFAULT' ? 'ALWAYS (Default)' : r.condition}</code>
                      <span className="rule-arrow">→</span>
                      <span className="rule-next">{r.next_step_id?.name || 'End Workflow'}</span>
                    </div>
                    <button className="btn btn-xs btn-danger" onClick={() => handleDeleteRule(r._id)} title="Delete rule"><i className="bi bi-trash"></i></button>
                  </div>
                ))}
                {rules.length === 0 && <div className="empty-hint">No rules for this step.</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
