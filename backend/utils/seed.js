const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      await User.create({
        email: 'admin@example.com',
        password: 'admin123',
        name: 'System Admin',
        role: 'admin',
      });
      console.log('Default admin account created: admin@example.com / admin123');
    } else {
      console.log('Admin account already exists.');
    }

    // Create sample manager and employee if not present
    const managerExists = await User.findOne({ email: 'manager@example.com' });
    if (!managerExists) {
      await User.create({
        email: 'manager@example.com',
        password: 'manager123',
        name: 'John Manager',
        role: 'manager',
      });
      console.log('Sample manager created: manager@example.com / manager123');
    }

    const employeeExists = await User.findOne({ email: 'employee@example.com' });
    if (!employeeExists) {
      await User.create({
        email: 'employee@example.com',
        password: 'employee123',
        name: 'Jane Employee',
        role: 'employee',
      });
      console.log('Sample employee created: employee@example.com / employee123');
    }

    await mongoose.disconnect();
    console.log('Seeding complete.');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedAdmin();
