const Execution = require('../models/Execution');
const Step = require('../models/Step');
const Rule = require('../models/Rule');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const RulesEngine = require('./RulesEngine');

const MAX_ITERATIONS = 100;

class WorkflowEngine {
  /**
   * Start a workflow execution
   */
  static async startExecution(execution) {
    execution.status = 'in_progress';
    execution.started_at = new Date();
    await execution.save();

    try {
      await WorkflowEngine.executeStep(execution, execution.current_step_id);
    } catch (error) {
      execution.status = 'failed';
      execution.ended_at = new Date();
      execution.logs.push({
        step_name: 'Engine Error',
        action: 'error',
        status: 'failed',
        message: error.message,
        timestamp: new Date(),
      });
      await execution.save();
      throw error;
    }
  }

  /**
   * Execute a step and proceed to next based on rules
   */
  static async executeStep(execution, stepId, iteration = 0) {
    if (iteration >= MAX_ITERATIONS) {
      execution.status = 'failed';
      execution.ended_at = new Date();
      execution.logs.push({
        step_name: 'Loop Protection',
        action: 'error',
        status: 'failed',
        message: `Max iterations (${MAX_ITERATIONS}) reached. Possible infinite loop.`,
        timestamp: new Date(),
      });
      await execution.save();
      return;
    }

    if (!stepId) {
      // No more steps — workflow complete
      execution.status = 'completed';
      execution.ended_at = new Date();
      execution.current_step_id = null;
      execution.logs.push({
        step_name: 'Workflow',
        action: 'completed',
        status: 'completed',
        message: 'Workflow execution completed successfully.',
        timestamp: new Date(),
      });
      await execution.save();
      return;
    }

    const step = await Step.findById(stepId);
    if (!step) {
      execution.status = 'failed';
      execution.ended_at = new Date();
      execution.logs.push({
        step_name: 'Unknown',
        action: 'error',
        status: 'failed',
        message: `Step ${stepId} not found`,
        timestamp: new Date(),
      });
      await execution.save();
      return;
    }

    const startTime = Date.now();
    execution.current_step_id = step._id;

    // --- Handle step by type ---
    if (step.step_type === 'approval') {
      await WorkflowEngine.handleApprovalStep(execution, step, startTime);
      // Stop execution — will resume when task is approved/rejected
      return;
    }

    if (step.step_type === 'notification') {
      await WorkflowEngine.handleNotificationStep(execution, step, startTime);
    }

    if (step.step_type === 'task') {
      const result = await WorkflowEngine.handleTaskStep(execution, step, startTime);
      if (result === 'paused') return; // assigned task — wait for completion
    }

    // --- Evaluate rules for next step ---
    const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });

    if (rules.length === 0) {
      // No rules — workflow rejected/failed (Phase 2 requirement)
      execution.status = 'failed';
      execution.ended_at = new Date();
      execution.current_step_id = null;
      execution.logs.push({
        step_id: step._id,
        step_name: step.name,
        action: 'error',
        status: 'failed',
        message: 'No rules defined for this step. Workflow rejected.',
        timestamp: new Date(),
      });
      await execution.save();
      return;
    }

    const { matchedRule, evaluations } = RulesEngine.evaluate(rules, execution.data);

    execution.logs.push({
      step_id: step._id,
      step_name: step.name,
      step_type: step.step_type,
      action: 'rule_evaluation',
      rules_evaluated: evaluations,
      selected_next_step: matchedRule
        ? { step_id: matchedRule.next_step_id, step_name: '' }
        : null,
      status: matchedRule ? 'matched' : 'no_match',
      duration_ms: Date.now() - startTime,
      timestamp: new Date(),
      message: matchedRule
        ? `Rule matched: ${matchedRule.condition}`
        : 'No matching rule found.',
    });
    await execution.save();

    if (!matchedRule) {
      execution.status = 'failed';
      execution.ended_at = new Date();
      execution.logs.push({
        step_name: step.name,
        action: 'error',
        status: 'failed',
        message: 'No matching rule and no DEFAULT rule. Workflow failed.',
        timestamp: new Date(),
      });
      await execution.save();
      return;
    }

    if (!matchedRule.next_step_id) {
      execution.status = 'completed';
      execution.ended_at = new Date();
      execution.current_step_id = null;
      execution.logs.push({
        step_name: step.name,
        action: 'end',
        status: 'completed',
        message: 'Matched rule has no next step. Workflow completed.',
        timestamp: new Date(),
      });
      await execution.save();
      return;
    }

    // Fill in next step name for the log
    const nextStep = await Step.findById(matchedRule.next_step_id);
    if (nextStep) {
      const lastLog = execution.logs[execution.logs.length - 1];
      if (lastLog && lastLog.selected_next_step) {
        lastLog.selected_next_step.step_name = nextStep.name;
      }
      await execution.save();
    }

    // Continue
    await WorkflowEngine.executeStep(execution, matchedRule.next_step_id, iteration + 1);
  }

  /**
   * Handle approval step — create a Task and pause
   */
  static async handleApprovalStep(execution, step, startTime) {
    let assignee = null;

    if (step.metadata?.assigned_to) {
      assignee = await User.findById(step.metadata.assigned_to);
    } else if (step.metadata?.assigned_role) {
      // Find first active user with the role
      assignee = await User.findOne({ role: step.metadata.assigned_role });
    }

    if (!assignee) {
      execution.logs.push({
        step_id: step._id,
        step_name: step.name,
        step_type: 'approval',
        action: 'waiting_for_approval',
        status: 'pending',
        duration_ms: Date.now() - startTime,
        timestamp: new Date(),
        message: `No assignee found for this approval step. Check step configuration.`,
      });
      await execution.save();
      return;
    }

    const task = await Task.create({
      execution_id: execution._id,
      step_id: step._id,
      assigned_to: assignee._id,
      status: 'pending',
      step_type: 'approval',
    });

    execution.logs.push({
      step_id: step._id,
      step_name: step.name,
      step_type: 'approval',
      action: 'waiting_for_approval',
      status: 'pending',
      approver: assignee._id,
      duration_ms: Date.now() - startTime,
      timestamp: new Date(),
      message: `Approval task created and assigned to ${assignee.name} (${assignee.role}).`,
    });
    await execution.save();

    // Trigger notification
    const notification = await Notification.create({
      user_id: assignee._id,
      type: 'approval_assigned',
      title: 'Action Required: Approval',
      message: `You have been assigned an approval for workflow execution: ${step.name}`,
      related_entity_id: task._id,
      entity_model: 'Task'
    });

    if (global.io && global.userSockets) {
      const socketId = global.userSockets.get(assignee._id.toString());
      if (socketId) {
        global.io.to(socketId).emit('new_notification', notification);
        global.io.to(socketId).emit('task_count_update');
      }
    }
  }

  /**
   * Handle notification step — broadcast to all users
   */
  static async handleNotificationStep(execution, step, startTime) {
    const channel = step.metadata?.notification_channel || 'email';
    const messageText = step.metadata?.message || step.name;

    execution.logs.push({
      step_id: step._id,
      step_name: step.name,
      step_type: 'notification',
      action: 'notification_sent',
      status: 'completed',
      duration_ms: Date.now() - startTime,
      timestamp: new Date(),
      message: `System notification broadcasted via ${channel}: ${messageText}`,
    });
    await execution.save();

    try {
      // Get all users
      const users = await User.find({}, '_id');
      
      const notificationsData = users.map(u => ({
        user_id: u._id,
        type: 'general',
        title: 'System Notification',
        message: messageText,
        related_entity_id: execution._id,
        entity_model: 'Execution'
      }));

      if (notificationsData.length > 0) {
        const createdNotifications = await Notification.insertMany(notificationsData);
        
        if (global.io && global.userSockets) {
          createdNotifications.forEach(notif => {
            const socketId = global.userSockets.get(notif.user_id.toString());
            if (socketId) {
              global.io.to(socketId).emit('new_notification', notif);
              global.io.to(socketId).emit('task_count_update');
            }
          });
        }
      }
    } catch (err) {
      console.error('Failed to broadcast global notification:', err);
    }
  }

  /**
   * Handle task step — automated action
   */
  static async handleTaskStep(execution, step, startTime) {
    const description = step.metadata?.description || '';

    // If a specific user or role is assigned, create a task and pause
    if (step.metadata?.assigned_to || step.metadata?.assigned_role) {
      const assignee = step.metadata.assigned_to 
        ? await User.findById(step.metadata.assigned_to)
        : await User.findOne({ role: step.metadata.assigned_role });

      if (assignee) {
        await Task.create({
          execution_id: execution._id,
          step_id: step._id,
          assigned_to: assignee._id,
          status: 'pending',
          step_type: 'task',
        });

        execution.logs.push({
          step_id: step._id,
          step_name: step.name,
          step_type: 'task',
          action: 'waiting_for_completion',
          status: 'pending',
          approver: assignee._id,
          duration_ms: Date.now() - startTime,
          timestamp: new Date(),
          message: `Task "${step.name}" assigned to ${assignee.name} (${assignee.role}).${description ? ' Description: ' + description : ''}`,
        });
        await execution.save();

        // Trigger notification
        const taskDoc = await Task.findOne({ execution_id: execution._id, step_id: step._id, status: 'pending' }).sort({ createdAt: -1 });
        if (taskDoc) {
          const notification = await Notification.create({
            user_id: assignee._id,
            type: 'task_assigned',
            title: 'New Task Assigned',
            message: `You have been assigned a task for workflow execution: ${step.name}`,
            related_entity_id: taskDoc._id,
            entity_model: 'Task'
          });

          if (global.io && global.userSockets) {
            const socketId = global.userSockets.get(assignee._id.toString());
            if (socketId) {
              global.io.to(socketId).emit('new_notification', notification);
              global.io.to(socketId).emit('task_count_update');
            }
          }
        }

        // Pause — will resume when task is approved/completed
        return 'paused';
      }
    }

    // No assignment — execute automatically
    execution.logs.push({
      step_id: step._id,
      step_name: step.name,
      step_type: 'task',
      action: 'task_executed',
      status: 'completed',
      duration_ms: Date.now() - startTime,
      timestamp: new Date(),
      message: `Task "${step.name}" executed automatically.${description ? ' Description: ' + description : ''}`,
    });
    await execution.save();
  }

  /**
   * Resume execution after an approval/rejection
   */
  static async resumeAfterApproval(execution, step, approved) {
    if (!approved) {
      execution.status = 'failed';
      execution.ended_at = new Date();
      execution.current_step_id = null;
      execution.logs.push({
        step_id: step._id,
        step_name: step.name,
        step_type: 'approval',
        action: 'rejected',
        status: 'failed',
        timestamp: new Date(),
        message: `Approval rejected at step "${step.name}". Workflow stopped.`,
      });
      await execution.save();
      return;
    }

    execution.logs.push({
      step_id: step._id,
      step_name: step.name,
      step_type: 'approval',
      action: 'approved',
      status: 'completed',
      timestamp: new Date(),
      message: `Step "${step.name}" approved. Continuing workflow.`,
    });
    await execution.save();

    // Evaluate rules and continue
    const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });

    if (rules.length === 0) {
      execution.status = 'failed';
      execution.ended_at = new Date();
      execution.current_step_id = null;
      execution.logs.push({
        step_id: step._id,
        step_name: step.name,
        action: 'error',
        status: 'failed',
        message: 'No rules after approval. Workflow rejected.',
        timestamp: new Date(),
      });
      await execution.save();
      return;
    }

    const { matchedRule, evaluations } = RulesEngine.evaluate(rules, execution.data);

    execution.logs.push({
      step_id: step._id,
      step_name: step.name,
      action: 'rule_evaluation',
      rules_evaluated: evaluations,
      selected_next_step: matchedRule
        ? { step_id: matchedRule.next_step_id }
        : null,
      status: matchedRule ? 'matched' : 'no_match',
      timestamp: new Date(),
    });
    await execution.save();

    if (matchedRule && matchedRule.next_step_id) {
      await WorkflowEngine.executeStep(execution, matchedRule.next_step_id);
    } else if (matchedRule && !matchedRule.next_step_id) {
      execution.status = 'completed';
      execution.ended_at = new Date();
      execution.current_step_id = null;
      execution.logs.push({
        step_name: step.name,
        action: 'end',
        status: 'completed',
        message: 'Workflow completed via end rule.',
        timestamp: new Date(),
      });
      await execution.save();
    } else {
      execution.status = 'failed';
      execution.ended_at = new Date();
      execution.current_step_id = null;
      execution.logs.push({
        step_name: step.name,
        action: 'error',
        status: 'failed',
        message: 'No matching rule after approval. Workflow rejected.',
        timestamp: new Date(),
      });
      await execution.save();
    }
  }

  /**
   * Resume execution after a standard task completion
   */
  static async resumeAfterTaskCompletion(execution, step) {
    execution.logs.push({
      step_id: step._id,
      step_name: step.name,
      step_type: 'task',
      action: 'completed',
      status: 'completed',
      timestamp: new Date(),
      message: `Task "${step.name}" completed by assignee. Continuing workflow.`,
    });
    await execution.save();

    // Evaluate rules and continue
    const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });

    if (rules.length === 0) {
      execution.status = 'completed';
      execution.ended_at = new Date();
      execution.current_step_id = null;
      execution.logs.push({
        step_name: step.name,
        action: 'no_rules',
        status: 'completed',
        message: 'No rules after task completion. Workflow completed.',
        timestamp: new Date(),
      });
      await execution.save();
      return;
    }

    const { matchedRule, evaluations } = RulesEngine.evaluate(rules, execution.data);

    execution.logs.push({
      step_id: step._id,
      step_name: step.name,
      action: 'rule_evaluation',
      rules_evaluated: evaluations,
      selected_next_step: matchedRule
        ? { step_id: matchedRule.next_step_id }
        : null,
      status: matchedRule ? 'matched' : 'no_match',
      timestamp: new Date(),
    });
    await execution.save();

    if (matchedRule && matchedRule.next_step_id) {
      await WorkflowEngine.executeStep(execution, matchedRule.next_step_id);
    } else {
      execution.status = 'completed';
      execution.ended_at = new Date();
      execution.current_step_id = null;
      await execution.save();
    }
  }
}

module.exports = WorkflowEngine;
