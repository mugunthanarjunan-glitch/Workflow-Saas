const mongoose = require('mongoose');
const Task = require('./models/Task');
const Step = require('./models/Step');
require('dotenv').config();

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow-db');
    console.log('Connected to MongoDB');

    const allTasks = await Task.find({}).populate('step_id');
    console.log(`Total tasks in DB: ${allTasks.length}`);

    const statuses = {};
    const types = {};
    const stepTypes = {};

    allTasks.forEach(t => {
      statuses[t.status] = (statuses[t.status] || 0) + 1;
      types[t.step_type] = (types[t.step_type] || 0) + 1;
      if (t.step_id) {
        stepTypes[t.step_id.step_type] = (stepTypes[t.step_id.step_type] || 0) + 1;
      }
    });

    console.log('Statuses found:', statuses);
    console.log('Task step_type values found:', types);
    console.log('Populated step_id.step_type values found:', stepTypes);

    // Check specific user tasks if possible
    // (We don't know the exact user ID here without looking at more logs, but we can see the first few)
    if (allTasks.length > 0) {
        console.log('First task snippet:', {
            id: allTasks[0]._id,
            status: allTasks[0].status,
            step_type: allTasks[0].step_type,
            assigned_to: allTasks[0].assigned_to
        });
    }

    process.exit(0);
  } catch (err) {
    console.error('Diagnosis failed:', err);
    process.exit(1);
  }
}

diagnose();
