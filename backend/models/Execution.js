const mongoose = require('mongoose');

const logEntrySchema = new mongoose.Schema({
  step_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Step' },
  step_name: String,
  step_type: String,
  action: String,
  rules_evaluated: [
    {
      rule_id: mongoose.Schema.Types.ObjectId,
      condition: String,
      result: Boolean,
    },
  ],
  selected_next_step: {
    step_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Step' },
    step_name: String,
  },
  status: String,
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  duration_ms: Number,
  timestamp: { type: Date, default: Date.now },
  message: String,
}, { _id: false });

const executionSchema = new mongoose.Schema({
  workflow_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
  },
  workflow_version: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'canceled'],
    default: 'pending',
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  logs: [logEntrySchema],
  current_step_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Step',
    default: null,
  },
  triggered_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  started_at: {
    type: Date,
    default: Date.now,
  },
  ended_at: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Execution', executionSchema);
