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
  const [loading, setLoading] = useState(true);
  const [editingWf, setEditingWf] = useState(false);
  const [wfForm, setWfForm] = useState({ name: '', description: '' });
  const [schemaFields, setSchemaFields] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Modal/Drawer states
  const [activeStepId, setActiveStepId] = useState(null); // Step being configured in drawer
  const [showStepForm, setShowStepForm] = useState(false);
  const [newStepAtOrder, setNewStepAtOrder] = useState(0);
  const [stepForm, setStepForm] = useState({ 
    name: '', 
    step_type: 'task', 
    order: 0, 
    assigned_to: '', 
    assigned_role: '', 
    task_description: '', 
    notification_channel: 'email', 
    notification_message: '' 
  });
  const [newRule, setNewRule] = useState({ condition: '', next_step_id: '' });
  const [showRuleForm, setShowRuleForm] = useState(false);

  const resetStepForm = () => {
    setStepForm({ 
      name: '', 
      step_type: 'task', 
      order: 0, 
      assigned_to: '', 
      assigned_role: '', 
      task_description: '', 
      notification_channel: 'email', 
      notification_message: '' 
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: wf } = await getWorkflow(id);
      setWorkflow(wf);
      setWfForm({ name: wf.name, description: wf.description });
      
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
      const stepsWithRules = await Promise.all(s.map(async (step) => {
        const { data: r } = await getRules(step._id);
        return { ...step, rules: r };
      }));
      setSteps(stepsWithRules.sort((a, b) => a.order - b.order));

      const { data: u } = await getUsers();
      setUsers(u);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleUpdateWorkflow = async (e) => {
    e.preventDefault();
    const schema = {};
    schemaFields.forEach(f => {
      if (f.name) schema[f.name] = { type: f.type, required: f.required };
    });
    try {
      await updateWorkflow(id, { ...wfForm, input_schema: schema });
      setEditingWf(false);
      fetchData();
    } catch (err) {
      alert('Update failed');
    }
  };

  const getStepName = (nextStepId) => {
    if (!nextStepId) return 'End';
    // If populated by backend
    if (typeof nextStepId === 'object' && nextStepId.name) return nextStepId.name;
    // Fallback to local lookup
    const targetId = typeof nextStepId === 'object' ? nextStepId._id : nextStepId;
    const step = steps.find(s => s._id === targetId);
    return step ? step.name : 'End';
  };

  const addSchemaField = () => {
    setSchemaFields([...schemaFields, { name: '', type: 'string', required: false }]);
  };

  const removeSchemaField = (index) => {
    setSchemaFields(schemaFields.filter((_, i) => i !== index));
  };

  const updateSchemaField = (index, field) => {
    const newFields = [...schemaFields];
    newFields[index] = { ...newFields[index], ...field };
    setSchemaFields(newFields);
  };

  const handleCreateStep = async (e) => {
    e.preventDefault();
    try {
      const metadata = {};
      if (stepForm.step_type === 'notification') {
        metadata.notification_channel = stepForm.notification_channel;
        metadata.message = stepForm.notification_message;
      } else {
        if (stepForm.assigned_to) metadata.assigned_to = stepForm.assigned_to;
        if (stepForm.assigned_role) metadata.assigned_role = stepForm.assigned_role;
        if (stepForm.task_description) metadata.description = stepForm.task_description;
      }

      await createStep(id, { 
        name: stepForm.name, 
        step_type: stepForm.step_type, 
        order: newStepAtOrder,
        metadata 
      });

      setShowStepForm(false);
      resetStepForm();
      fetchData();
    } catch (err) {
      alert('Failed to create step');
    }
  };

  const handleDeleteStep = async (stepId) => {
    if (!confirm('Delete this step?')) return;
    try {
      await deleteStep(stepId);
      fetchData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const setAsStart = async (stepId) => {
    try {
      await updateWorkflow(id, { start_step_id: stepId });
      fetchData();
    } catch (err) {
      alert('Failed to set start step');
    }
  };

  const handleCreateRule = async (e, stepId) => {
    e.preventDefault();
    if (!newRule.condition) return alert('Condition is required');
    try {
      await createRule(stepId, { 
        condition: newRule.condition, 
        next_step_id: newRule.next_step_id || null, 
        priority: 1 
      });
      setNewRule({ condition: '', next_step_id: '' });
      setShowRuleForm(false);
      fetchData();
    } catch (err) {
      alert('Failed to add rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await deleteRule(ruleId);
      fetchData();
    } catch (err) {
      alert('Rule deletion failed');
    }
  };

  if (loading) return <div className="loading">Loading canvas...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/workflows" className="back-link">← Workflows</Link>
          <h1>{workflow.name} Editor</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-sm" onClick={() => setEditingWf(!editingWf)}>
            {editingWf ? 'Close Settings' : 'Settings'}
          </button>
          <Link to={`/workflows/${id}/execute`} className="btn btn-sm btn-accent">Execute</Link>
        </div>
      </div>

      {editingWf && (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto 24px' }}>
          <form onSubmit={handleUpdateWorkflow}>
            <div className="form-row">
              <div className="form-group">
                <label>Workflow Name</label>
                <input value={wfForm.name} onChange={e => setWfForm({...wfForm, name: e.target.value})} required />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={wfForm.description} onChange={e => setWfForm({...wfForm, description: e.target.value})} />
            </div>

            <div className="schema-section" style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>Input Schema</h3>
                <button type="button" className="btn btn-xs btn-primary" onClick={addSchemaField}>+ Add Field</button>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Define fields needed to start this workflow.</p>
              
              {schemaFields.length === 0 ? (
                 <div className="empty-state-sm">No input fields defined.</div>
              ) : (
                <div className="schema-fields">
                  {schemaFields.map((field, idx) => (
                    <div key={idx} className="schema-field-row" style={{ display: 'flex', gap: '8px', marginBottom: '8px', background: 'var(--bg-primary)', padding: '10px', borderRadius: '4px' }}>
                      <input 
                        style={{ flex: 2 }} 
                        placeholder="Field Name" 
                        value={field.name} 
                        onChange={e => updateSchemaField(idx, { name: e.target.value })} 
                      />
                      <select 
                        style={{ flex: 1 }} 
                        value={field.type} 
                        onChange={e => updateSchemaField(idx, { type: e.target.value })}
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="date">Date</option>
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                        <input type="checkbox" checked={field.required} onChange={e => updateSchemaField(idx, { required: e.target.checked })} /> Required
                      </label>
                      <button type="button" className="btn btn-xs btn-danger" onClick={() => removeSchemaField(idx)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary">Save Workflow Details & Schema</button>
            </div>
          </form>
        </div>
      )}

      {showStepForm && (
        <div className="modal-overlay" onClick={() => setShowStepForm(false)}>
          <div className="modal-content card" onClick={e => e.stopPropagation()}>
            <h3>Add New Step</h3>
            <form onSubmit={handleCreateStep}>
              <div className="form-group">
                <label>Step Name</label>
                <input value={stepForm.name} onChange={e => setStepForm({...stepForm, name: e.target.value})} required placeholder="e.g. Verify Documents" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Step Type</label>
                  <select value={stepForm.step_type} onChange={e => setStepForm({...stepForm, step_type: e.target.value})}>
                    <option value="task">Task (Auto/Manual)</option>
                    <option value="approval">Manual Approval</option>
                    <option value="notification">Notification</option>
                  </select>
                </div>
              </div>

              {(stepForm.step_type === 'task' || stepForm.step_type === 'approval') && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Assign to Specific User (Optional for Task)</label>
                    <select value={stepForm.assigned_to} onChange={e => setStepForm({...stepForm, assigned_to: e.target.value})}>
                      <option value="">— Select User —</option>
                      {users.map(u => (
                        <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {stepForm.step_type === 'approval' && !stepForm.assigned_to && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Assign to Role</label>
                    <select value={stepForm.assigned_role} onChange={e => setStepForm({...stepForm, assigned_role: e.target.value})}>
                      <option value="">— Select Role —</option>
                      <option value="manager">Manager</option>
                      <option value="finance">Finance</option>
                      <option value="ceo">CEO</option>
                      <option value="hr">HR</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary">Add Step to Canvas</button>
                <button type="button" className="btn" onClick={() => setShowStepForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="editor-canvas">
        <div className="node-connector" style={{ height: '20px' }}></div>
        
        {steps.length === 0 && (
          <button className="btn btn-primary" onClick={() => { resetStepForm(); setShowStepForm(true); setNewStepAtOrder(0); }}>
            + Add First Step
          </button>
        )}

        {steps.map((step, index) => (
          <div key={step._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {/* Step Card */}
            <div className={`node-card ${workflow.start_step_id === step._id ? 'start-node' : ''} ${activeStepId === step._id ? 'selected' : ''}`} onClick={() => setActiveStepId(activeStepId === step._id ? null : step._id)}>
              <div className="node-header">
                <div className={`node-icon ${step.step_type}`}>
                   {step.step_type === 'task' && <i className="bi bi-gear-fill"></i>}
                   {step.step_type === 'approval' && <i className="bi bi-check-circle-fill"></i>}
                   {step.step_type === 'notification' && <i className="bi bi-bell-fill"></i>}
                </div>
                <div className="node-title">{index + 1}. {step.name}</div>
                <div className="node-actions">
                  <button className="btn btn-xs btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteStep(step._id); }}>
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>

              <div className="node-content">
                <div className="badge badge-sm">{step.step_type.toUpperCase()}</div>
                {step.metadata?.assigned_role && (
                   <span style={{ fontSize: '0.75rem', marginLeft: '8px', color: 'var(--text-muted)' }}>
                     Role: <strong>{step.metadata.assigned_role.toUpperCase()}</strong>
                   </span>
                )}
                {step.metadata?.assigned_to && (
                   <span style={{ fontSize: '0.75rem', marginLeft: '8px', color: 'var(--text-muted)' }}>
                     User: <strong>{users.find(u => u._id === step.metadata.assigned_to)?.name || 'Assigned'}</strong>
                   </span>
                )}
                {!step.metadata?.assigned_role && !step.metadata?.assigned_to && step.step_type === 'task' && (
                   <span style={{ fontSize: '0.75rem', marginLeft: '8px', color: 'var(--info)' }}>
                     <i className="bi bi-robot"></i> Automated
                   </span>
                )}
              </div>

              {step.rules && step.rules.length > 0 && (
                <div className="node-branches">
                  {step.rules.map(rule => (
                    <div key={rule._id} className="branch-item">
                      <i className="bi bi-arrow-return-right"></i>
                    If <span className="cond">{rule.condition}</span> → <strong>{getStepName(rule.next_step_id)}</strong>
                  </div>
                  ))}
                </div>
              )}
              
              <div className="node-footer">
                <button className="btn btn-xs btn-ghost">
                  <i className="bi bi-gear" style={{ marginRight: '4px' }}></i>Configure
                </button>
              </div>
            </div>

            {/* Active Step Drawer (Configuration) */}
            {activeStepId === step._id && (
              <div className="node-drawer card">
                <div className="drawer-header">
                  <h4>Configure Node {index + 1}</h4>
                  <button className="btn btn-xs" onClick={(e) => { e.stopPropagation(); setActiveStepId(null); }}>✕</button>
                </div>
                
                <div className="drawer-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h5 style={{ margin: 0 }}>Transition Rules</h5>
                    <button className="btn btn-xs btn-primary" onClick={() => setShowRuleForm(!showRuleForm)}>
                      {showRuleForm ? 'Cancel' : '+ Add Rule'}
                    </button>
                  </div>

                  {showRuleForm && (
                    <form onSubmit={(e) => handleCreateRule(e, step._id)} className="rule-create-form card" style={{ padding: '12px', background: 'var(--bg-primary)', marginBottom: '12px' }}>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.75rem' }}>Condition (e.g. amount &gt; 5000 or DEFAULT)</label>
                        <input 
                          style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
                          value={newRule.condition} 
                          onChange={e => setNewRule({...newRule, condition: e.target.value})} 
                          placeholder="e.g. amount > 100"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '0.75rem' }}>Then go to Step...</label>
                        <select 
                          style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
                          value={newRule.next_step_id} 
                          onChange={e => setNewRule({...newRule, next_step_id: e.target.value})}
                        >
                          <option value="">— End Workflow —</option>
                          {steps.map((s, si) => (
                            <option key={s._id} value={s._id}>{si + 1}. {s.name}</option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className="btn btn-xs btn-accent btn-full">Save Rule</button>
                    </form>
                  )}

                  <div className="rules-list-simple">
                    {step.rules.map(rule => (
                      <div key={rule._id} className="rule-item-simple">
                         <div style={{ fontSize: '0.85rem' }}>
                           <span className="badge badge-sm" style={{ marginRight: '6px' }}>IF</span> 
                           <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{rule.condition}</span>
                           <i className="bi bi-arrow-right" style={{ margin: '0 8px' }}></i>
                           <strong>{getStepName(rule.next_step_id)}</strong>
                         </div>
                         <button className="btn btn-xs btn-ghost btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule._id); }} title="Delete Rule">
                           <i className="bi bi-x-circle"></i>
                         </button>
                      </div>
                    ))}
                    {step.rules.length === 0 && !showRuleForm && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                        No rules defined. Workflow will end here.
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="drawer-section" style={{ marginTop: '12px' }}>
                  <h5>Quick Actions</h5>
                  <button className="btn btn-xs btn-full" onClick={(e) => { e.stopPropagation(); setAsStart(step._id); }} disabled={workflow.start_step_id === step._id}>
                    Set as Entry Point
                  </button>
                </div>
              </div>
            )}

            {/* Visual Connector & Insertion Point */}
            <div className="node-connector">
              <button 
                className="add-node-between" 
                title="Insert Step Here"
                onClick={(e) => { e.stopPropagation(); resetStepForm(); setShowStepForm(true); setNewStepAtOrder(step.order + 0.1); }}
              >
                <i className="bi bi-plus"></i>
              </button>
            </div>
          </div>
        ))}

        {steps.length > 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '20px' }}>
            <i className="bi bi-flag-fill" style={{ marginRight: '8px' }}></i>Workflow Terminal
          </div>
        )}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          width: 100%;
          max-width: 500px;
          padding: 32px;
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .node-drawer {
           margin-top: -12px;
           margin-bottom: 24px;
           border-top-left-radius: 0;
           border-top-right-radius: 0;
           border-top: none;
           box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
           cursor: default;
        }
      `}</style>
    </div>
  );
}
