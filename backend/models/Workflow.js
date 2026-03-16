const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  version: {
    type: Number,
    default: 1,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  input_schema: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  start_step_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Step',
    default: null,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Workflow', workflowSchema);
