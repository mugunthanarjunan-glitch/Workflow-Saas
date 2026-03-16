const Rule = require('../models/Rule');
const Step = require('../models/Step');

exports.createRule = async (req, res, next) => {
  try {
    const { step_id } = req.params;
    const { condition, next_step_id, priority } = req.body;

    if (!condition) {
      return res.status(400).json({ error: 'Rule condition is required' });
    }

    const step = await Step.findById(step_id);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    const rule = await Rule.create({
      step_id,
      condition,
      next_step_id: next_step_id || null,
      priority: priority || 99,
    });

    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
};

exports.getRules = async (req, res, next) => {
  try {
    const rules = await Rule.find({ step_id: req.params.step_id })
      .populate('next_step_id', 'name')
      .sort({ priority: 1 });
    res.json(rules);
  } catch (error) {
    next(error);
  }
};

exports.updateRule = async (req, res, next) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    const { condition, next_step_id, priority } = req.body;
    if (condition !== undefined) rule.condition = condition;
    if (next_step_id !== undefined) rule.next_step_id = next_step_id;
    if (priority !== undefined) rule.priority = priority;

    await rule.save();
    res.json(rule);
  } catch (error) {
    next(error);
  }
};

exports.deleteRule = async (req, res, next) => {
  try {
    const rule = await Rule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json({ message: 'Rule deleted' });
  } catch (error) {
    next(error);
  }
};
