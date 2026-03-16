const Workflow = require('../models/Workflow');
const Step = require('../models/Step');
const Rule = require('../models/Rule');

exports.createWorkflow = async (req, res, next) => {
  try {
    const { name, description, input_schema } = req.body;
    if (!name) return res.status(400).json({ error: 'Workflow name is required' });

    const workflow = await Workflow.create({
      name,
      description,
      input_schema: input_schema || {},
      created_by: req.user._id,
    });

    res.status(201).json(workflow);
  } catch (error) {
    next(error);
  }
};

exports.getWorkflows = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.user.role !== 'admin') {
      filter.created_by = req.user._id;
    }

    const [workflows, total] = await Promise.all([
      Workflow.find(filter)
        .populate('created_by', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Workflow.countDocuments(filter),
    ]);

    res.json({
      workflows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id)
      .populate('created_by', 'name email');

    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    if (req.user.role !== 'admin' && workflow.created_by._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(workflow);
  } catch (error) {
    next(error);
  }
};

exports.updateWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    if (req.user.role !== 'admin' && workflow.created_by.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, description, input_schema, is_active, start_step_id } = req.body;
    if (name) workflow.name = name;
    if (description !== undefined) workflow.description = description;
    if (input_schema !== undefined) workflow.input_schema = input_schema;
    if (is_active !== undefined) workflow.is_active = is_active;
    if (start_step_id !== undefined) workflow.start_step_id = start_step_id;

    workflow.version += 1;
    await workflow.save();

    res.json(workflow);
  } catch (error) {
    next(error);
  }
};

exports.deleteWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    if (req.user.role !== 'admin' && workflow.created_by.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete related steps, rules, and the workflow
    const steps = await Step.find({ workflow_id: workflow._id });
    const stepIds = steps.map((s) => s._id);
    await Rule.deleteMany({ step_id: { $in: stepIds } });
    await Step.deleteMany({ workflow_id: workflow._id });
    await Workflow.findByIdAndDelete(workflow._id);

    res.json({ message: 'Workflow and related data deleted' });
  } catch (error) {
    next(error);
  }
};
