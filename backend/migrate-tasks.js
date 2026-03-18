const mongoose = require('mongoose');
const Task = require('./models/Task');
const Step = require('./models/Step');
require('dotenv').config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow-db');
  const tasks = await Task.find({ step_type: { $exists: false } }).populate('step_id');
  console.log(`Migrating ${tasks.length} tasks...`);
  for (const task of tasks) {
    if (task.step_id) {
      task.step_type = task.step_id.step_type;
      await task.save();
    }
  }
  console.log('Migration complete');
  process.exit(0);
}

migrate();
