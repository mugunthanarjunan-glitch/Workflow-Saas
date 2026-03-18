const Execution = require('../models/Execution');
const Workflow = require('../models/Workflow');
const WorkflowEngine = require('../services/WorkflowEngine');

exports.executeWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.workflow_id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    if (!workflow.is_active) {
      return res.status(400).json({ error: 'Workflow is not active' });
    }

    if (!workflow.start_step_id) {
      return res.status(400).json({ error: 'Workflow has no start step configured' });
    }

    // Validate input against schema
    const inputData = req.body.data || {};
    const schemaErrors = validateInput(workflow.input_schema, inputData);
    if (schemaErrors.length > 0) {
      return res.status(400).json({ error: 'Input validation failed', details: schemaErrors });
    }

    const execution = await Execution.create({
      workflow_id: workflow._id,
      workflow_version: workflow.version,
      status: 'pending',
      data: inputData,
      current_step_id: workflow.start_step_id,
      triggered_by: req.user._id,
      logs: [{
        step_name: 'Workflow',
        action: 'started',
        status: 'pending',
        message: `Workflow "${workflow.name}" v${workflow.version} execution started.`,
        timestamp: new Date(),
      }],
    });

    // Start engine asynchronously
    WorkflowEngine.startExecution(execution).catch((err) => {
      console.error('Workflow engine error:', err);
    });

    res.status(201).json(execution);
  } catch (error) {
    next(error);
  }
};

exports.getExecution = async (req, res, next) => {
  try {
    const execution = await Execution.findById(req.params.id)
      .populate('workflow_id', 'name')
      .populate('triggered_by', 'name email')
      .populate('current_step_id', 'name step_type');

    if (!execution) return res.status(404).json({ error: 'Execution not found' });

    res.json(execution);
  } catch (error) {
    next(error);
  }
};

exports.getExecutions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.user.role !== 'admin') {
      filter.triggered_by = req.user._id;
    }
    if (req.query.workflow_id) {
      filter.workflow_id = req.query.workflow_id;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [executions, total] = await Promise.all([
      Execution.find(filter)
        .populate('workflow_id', 'name')
        .populate('triggered_by', 'name email')
        .populate('current_step_id', 'name step_type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Execution.countDocuments(filter),
    ]);

    res.json({
      executions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelExecution = async (req, res, next) => {
  try {
    const execution = await Execution.findById(req.params.id);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });

    if (['completed', 'canceled', 'failed'].includes(execution.status)) {
      return res.status(400).json({ error: `Cannot cancel execution with status "${execution.status}"` });
    }

    execution.status = 'canceled';
    execution.ended_at = new Date();
    execution.logs.push({
      step_name: 'Workflow',
      action: 'canceled',
      status: 'canceled',
      message: 'Execution was manually canceled.',
      timestamp: new Date(),
    });
    await execution.save();

    res.json(execution);
  } catch (error) {
    next(error);
  }
};

exports.retryExecution = async (req, res, next) => {
  try {
    const original = await Execution.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Execution not found' });

    if (!['failed', 'canceled'].includes(original.status)) {
      return res.status(400).json({ error: 'Can only retry failed or canceled executions' });
    }

    const workflow = await Workflow.findById(original.workflow_id);
    if (!workflow) return res.status(404).json({ error: 'Original workflow not found' });

    const execution = await Execution.create({
      workflow_id: workflow._id,
      workflow_version: workflow.version,
      status: 'pending',
      data: original.data,
      current_step_id: workflow.start_step_id,
      triggered_by: req.user._id,
      logs: [{
        step_name: 'Workflow',
        action: 'retry',
        status: 'pending',
        message: `Retrying workflow "${workflow.name}" (original: ${original._id}).`,
        timestamp: new Date(),
      }],
    });

    WorkflowEngine.startExecution(execution).catch((err) => {
      console.error('Workflow engine retry error:', err);
    });

    res.status(201).json(execution);
  } catch (error) {
    next(error);
  }
};

function validateInput(schema, data) {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;

  for (const [field, rules] of Object.entries(schema)) {
    if (rules.required && (data[field] === undefined || data[field] === null || data[field] === '')) {
      errors.push(`Field "${field}" is required`);
      continue;
    }

    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      // Auto-coerce types
      if (rules.type === 'number') {
        const num = Number(data[field]);
        if (isNaN(num)) {
          errors.push(`Field "${field}" must be a number`);
          continue;
        }
        data[field] = num; // coerce to number
      }
      if (rules.type === 'string' && typeof data[field] !== 'string') {
        data[field] = String(data[field]);
      }

      // Allowed values check with loose comparison
      if (rules.allowed_values && rules.allowed_values.length > 0) {
        const match = rules.allowed_values.some((v) => String(v) === String(data[field]));
        if (!match) {
          errors.push(`Field "${field}" must be one of: ${rules.allowed_values.join(', ')}`);
        }
      }
    }
  }

  return errors;
}
