const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  workflow_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  step_type: {
    type: String,
    enum: ['task', 'approval', 'notification'],
    required: true,
  },
  order: {
    type: Number,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

stepSchema.index({ workflow_id: 1, order: 1 });

module.exports = mongoose.model('Step', stepSchema);
