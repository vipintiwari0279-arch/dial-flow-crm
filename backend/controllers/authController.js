const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

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
      return res.status(400).json({ success: false, message: 'Please provide email/phone and password' });
    }

    const loginId = String(email).trim();
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: loginId },
          { phone: loginId }
        ]
      }
    });

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
      user: req.user
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

// @desc    Debug endpoint to see all users in the DB
// @route   GET /api/auth/debug
// @access  Public
exports.debugDb = async (req, res) => {
  try {
    const { User, Lead } = require('../models');
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'status']
    });

    const usersWithLeadCounts = await Promise.all(
      users.map(async (u) => {
        const count = await Lead.count({
          where: { allocatedTo: u.id, status: 'allocated' }
        });
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          allocatedLeads: count
        };
      })
    );

    res.status(200).json({
      success: true,
      users: usersWithLeadCounts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const nodemailer = require('nodemailer');

// @desc    Request forgot password OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { loginId } = req.body; // Can be email or phone number

  try {
    if (!loginId) {
      return res.status(400).json({ success: false, message: 'Please provide email or phone number' });
    }

    const cleanLoginId = String(loginId).trim();

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: cleanLoginId },
          { phone: cleanLoginId }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No user registered with this email or phone number' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to user (valid for 10 minutes)
    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log(`Generated Password Reset OTP for ${user.email} (${user.phone}): ${otp}`);

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent successfully.',
      testOtp: otp 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Verify OTP code
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  const { loginId, otp } = req.body;

  try {
    if (!loginId || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide email/phone and OTP code' });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: loginId },
          { phone: loginId }
        ],
        resetOtp: otp,
        resetOtpExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully.'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Reset password using OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  const { loginId, otp, newPassword } = req.body;

  try {
    if (!loginId || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide email/phone, OTP, and new password' });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: loginId },
          { phone: loginId }
        ],
        resetOtp: otp,
        resetOtpExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
    }

    // Set new password (will automatically hash on save)
    user.password = newPassword;
    user.resetOtp = null;
    user.resetOtpExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new credentials.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
