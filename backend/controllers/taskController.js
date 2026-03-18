const Task = require('../models/Task');
const Step = require('../models/Step');
const Execution = require('../models/Execution');
const WorkflowEngine = require('../services/WorkflowEngine');

// Background migration for old tasks missing step_type
const migrateMissingStepTypes = async () => {
  try {
    const tasks = await Task.find({ step_type: { $exists: false } }).populate('step_id');
    if (tasks.length > 0) {
      console.log(`Migrating ${tasks.length} tasks needing step_type...`);
      for (const t of tasks) {
        if (t.step_id && t.step_id.step_type) {
          t.step_type = t.step_id.step_type;
          await t.save();
        }
      }
      console.log('Task migration complete.');
    }
  } catch (err) {
    console.error('Task migration failed:', err);
  }
};
exports.migrateMissingStepTypes = migrateMissingStepTypes;


exports.getMyTaskCount = async (req, res, next) => {
  try {
    const count = await Task.countDocuments({
      assigned_to: req.user._id,
      status: { $in: ['pending', 'started'] }
    });
    res.json({ count });
  } catch (error) {
    next(error);
  }
};

exports.getMyTasks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let filter = { assigned_to: req.user._id };
    
    if (req.query.status && req.query.status.trim() !== '') {
      const statusValue = req.query.status.toLowerCase();
      if (statusValue === 'completed') {
        filter.status = { $in: ['approved', 'rejected', 'done', 'APPROVED', 'REJECTED', 'DONE'] };
      } else {
        filter.status = new RegExp(`^${req.query.status}$`, 'i');
      }
    }

    if (req.query.type && req.query.type.trim() !== '') {
      filter.step_type = req.query.type;
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('execution_id', 'status workflow_id data')
        .populate('step_id', 'name step_type metadata')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    res.json({
      tasks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

exports.approveTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.assigned_to.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'This task is not assigned to you' });
    }

    if (task.status !== 'pending') {
      return res.status(400).json({ error: `Task already ${task.status}` });
    }

    task.status = 'approved';
    await task.save();

    // Resume workflow
    const execution = await Execution.findById(task.execution_id);
    const step = await Step.findById(task.step_id);

    if (execution && step && execution.status === 'in_progress') {
      WorkflowEngine.resumeAfterApproval(execution, step, true).catch((err) => {
        console.error('Resume after approval error:', err);
      });
    }

    if (global.io && global.userSockets) {
      const socketId = global.userSockets.get(task.assigned_to.toString());
      if (socketId) global.io.to(socketId).emit('task_count_update');
    }

    res.json({ message: 'Task approved', task });
  } catch (error) {
    next(error);
  }
};

exports.rejectTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.assigned_to.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'This task is not assigned to you' });
    }

    if (task.status !== 'pending') {
      return res.status(400).json({ error: `Task already ${task.status}` });
    }

    task.status = 'rejected';
    await task.save();

    // Resume workflow (will fail/stop)
    const execution = await Execution.findById(task.execution_id);
    const step = await Step.findById(task.step_id);

    if (execution && step && execution.status === 'in_progress') {
      WorkflowEngine.resumeAfterApproval(execution, step, false).catch((err) => {
        console.error('Resume after rejection error:', err);
      });
    }

    if (global.io && global.userSockets) {
      const socketId = global.userSockets.get(task.assigned_to.toString());
      if (socketId) global.io.to(socketId).emit('task_count_update');
    }

    res.json({ message: 'Task rejected', task });
  } catch (error) {
    next(error);
  }
};

exports.startTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.assigned_to.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'This task is not assigned to you' });
    }

    if (task.status !== 'pending') {
      return res.status(400).json({ error: `Task already ${task.status}` });
    }

    task.status = 'started';
    await task.save();

    res.json({ message: 'Task started', task });
  } catch (error) {
    next(error);
  }
};

exports.completeTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.assigned_to.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'This task is not assigned to you' });
    }

    if (task.status !== 'started') {
      return res.status(400).json({ error: `Task must be started before completing (current status: ${task.status})` });
    }

    task.status = 'done';
    await task.save();

    // Resume workflow
    const execution = await Execution.findById(task.execution_id);
    const step = await Step.findById(task.step_id);

    if (execution && step && execution.status === 'in_progress') {
      WorkflowEngine.resumeAfterTaskCompletion(execution, step).catch((err) => {
        console.error('Resume after task completion error:', err);
      });
    }

    if (global.io && global.userSockets) {
      const socketId = global.userSockets.get(task.assigned_to.toString());
      if (socketId) global.io.to(socketId).emit('task_count_update');
    }

    res.json({ message: 'Task completed', task });
  } catch (error) {
    next(error);
  }
};
