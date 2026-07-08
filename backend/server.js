const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const { sequelize } = require('./models');
const seedDatabase = require('./config/seed');

// Load env variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Save io instance to app so it is accessible in controllers
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Dial Flow CRM API Server' });
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const agentRoutes = require('./routes/agentRoutes');
const leadRoutes = require('./routes/leadRoutes');
const callRoutes = require('./routes/callRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/attendance', attendanceRoutes);

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Agent registers their socket
  socket.on('register_agent', (data) => {
    console.log(`Agent registered: ${data.name} (${data.id})`);
    socket.join('agents');
    // Update status to online
    io.emit('agent_status_change', {
      agentId: data.id,
      name: data.name,
      status: 'online'
    });
  });

  // Call start/state changes (dialing, talking, paused)
  socket.on('call_state_change', (data) => {
    // data: { agentId, agentName, leadName, phone, state: 'dialing' | 'talking' | 'idle' }
    console.log(`Call state change for agent ${data.agentName}: ${data.state}`);
    io.emit('live_call_update', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Connect DB & Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Sync models
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully.');

    // Run database seeder
    await seedDatabase();

    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to sync DB and start server:', error);
  }
};

startServer();
