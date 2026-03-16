const Step = require('../models/Step');
const Rule = require('../models/Rule');
const Workflow = require('../models/Workflow');

exports.createStep = async (req, res, next) => {
  try {
    const { workflow_id } = req.params;
    const { name, step_type, order, metadata } = req.body;

    if (!name || !step_type) {
      return res.status(400).json({ error: 'Step name and type are required' });
    }

    const workflow = await Workflow.findById(workflow_id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const step = await Step.create({
      workflow_id,
      name,
      step_type,
      order: order || 0,
      metadata: metadata || {},
    });

    res.status(201).json(step);
  } catch (error) {
    next(error);
  }
};

exports.getSteps = async (req, res, next) => {
  try {
    const steps = await Step.find({ workflow_id: req.params.workflow_id })
      .sort({ order: 1 });
    res.json(steps);
  } catch (error) {
    next(error);
  }
};

exports.updateStep = async (req, res, next) => {
  try {
    const step = await Step.findById(req.params.id);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    const { name, step_type, order, metadata } = req.body;
    if (name) step.name = name;
    if (step_type) step.step_type = step_type;
    if (order !== undefined) step.order = order;
    if (metadata !== undefined) step.metadata = metadata;

    await step.save();
    res.json(step);
  } catch (error) {
    next(error);
  }
};

exports.deleteStep = async (req, res, next) => {
  try {
    const step = await Step.findById(req.params.id);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    await Rule.deleteMany({ step_id: step._id });
    await Step.findByIdAndDelete(step._id);

    res.json({ message: 'Step and related rules deleted' });
  } catch (error) {
    next(error);
  }
};
