require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const User = require('./models/User');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Route imports
const authRoutes = require('./routes/authRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const stepRoutes = require('./routes/stepRoutes');
const ruleRoutes = require('./routes/ruleRoutes');
const executionRoutes = require('./routes/executionRoutes');
const taskRoutes = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store active sockets mapping: userId -> socketId
const userSockets = new Map();
app.set('userSockets', userSockets);

// Make available globally for WorkflowEngine
global.io = io;
global.userSockets = userSockets;

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: No token'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  if (socket.user && socket.user.id) {
    userSockets.set(socket.user.id, socket.id);
  }

  socket.on('disconnect', () => {
    if (socket.user && socket.user.id) {
      userSockets.delete(socket.user.id);
    }
  });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api', stepRoutes);
app.use('/api', ruleRoutes);
app.use('/api', executionRoutes);
app.use('/api', taskRoutes);
app.use('/api', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  // Run background migrations
  const { migrateMissingStepTypes } = require('./controllers/taskController');
  migrateMissingStepTypes().catch(err => console.error('Initial migration error:', err));

  // Auto-seed admin
  const adminExists = await User.findOne({ email: 'admin@example.com' });
  if (!adminExists) {
    await User.create({
      email: 'admin@example.com',
      password: 'admin123',
      name: 'System Admin',
      role: 'admin',
    });
    console.log('Default admin account created: admin@example.com / admin123');
  }

  server.listen(PORT, () => {
    console.log(`Server & Socket.IO running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
