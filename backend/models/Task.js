const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  execution_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Execution',
    required: true,
  },
  step_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Step',
    required: true,
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'started', 'done'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

taskSchema.index({ assigned_to: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
