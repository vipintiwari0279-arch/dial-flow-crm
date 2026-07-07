const { User } = require('../models');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_dial_flow_crm_key_12345', {
    expiresIn: '30d'
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ where: { email } });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Set online status if logging in as agent
    if (user.role === 'agent') {
      user.status = 'online';
      await user.save();

      // Emit status change socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('agent_status_change', {
          agentId: user.id,
          name: user.name,
          status: 'online'
        });
      }
    }

    res.status(200).json({
      success: true,
      token: generateToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        status: req.user.status
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update agent status (online, offline, paused)
// @route   PUT /api/auth/status
// @access  Private
exports.updateStatus = async (req, res) => {
  const { status } = req.body;

  if (!['online', 'offline', 'paused'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    req.user.status = status;
    await req.user.save();

    // Broadcast update via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('agent_status_change', {
        agentId: req.user.id,
        name: req.user.name,
        status
      });
    }

    res.status(200).json({
      success: true,
      status: req.user.status
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
