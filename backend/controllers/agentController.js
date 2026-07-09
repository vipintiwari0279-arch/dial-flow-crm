const { User, Call, Target } = require('../models');
const { Op } = require('sequelize');

// Helper to get start and end of today
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// @desc    Get all agents with calls and target stats
// @route   GET /api/agents
// @access  Private (Admin Only)
exports.getAgents = async (req, res) => {
  try {
    const agents = await User.findAll({
      where: { role: 'agent' },
      attributes: ['id', 'name', 'email', 'phone', 'status', 'currentLeadId']
    });

    const { start, end } = getTodayRange();
    const todayStr = new Date().toISOString().split('T')[0];

    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        // Calls today count
        const callsCount = await Call.count({
          where: {
            agentId: agent.id,
            createdAt: { [Op.between]: [start, end] }
          }
        });

        // Connected calls today count
        const connectedCount = await Call.count({
          where: {
            agentId: agent.id,
            createdAt: { [Op.between]: [start, end] },
            disposition: {
              [Op.in]: ['interested', 'not_interested', 'callback']
            }
          }
        });

        // Current target
        const target = await Target.findOne({
          where: {
            agentId: agent.id,
            targetDate: todayStr
          }
        });

        // Total duration today
        const totalDuration = await Call.sum('duration', {
          where: {
            agentId: agent.id,
            createdAt: { [Op.between]: [start, end] }
          }
        }) || 0;

        // Convert duration to HH:MM:SS format
        const formatDuration = (secs) => {
          const hrs = Math.floor(secs / 3600).toString().padStart(2, '0');
          const mins = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
          const seconds = (secs % 60).toString().padStart(2, '0');
          return `${hrs}:${mins}:${seconds}`;
        };

        // Get latest call info
        const latestCall = await Call.findOne({
          where: { agentId: agent.id },
          order: [['createdAt', 'DESC']],
          include: ['lead']
        });

        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          phone: agent.phone || '-',
          status: agent.status,
          callsToday: callsCount,
          connected: connectedCount,
          duration: formatDuration(totalDuration),
          currentLead: latestCall && agent.status === 'online' && agent.currentLeadId ? latestCall.lead?.phone || '-' : '-',
          targetCalls: target ? target.targetCalls : 150
        };
      })
    );

    res.status(200).json({ success: true, agents: agentsWithStats });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create new agent
// @route   POST /api/agents
// @access  Private (Admin Only)
exports.createAgent = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide all details (Name, Email, Password, and Phone Number)' });
    }

    const agentExists = await User.findOne({ where: { email } });
    if (agentExists) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    const phoneExists = await User.findOne({ where: { phone } });
    if (phoneExists) {
      return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }

    const newAgent = await User.create({
      name,
      email,
      password,
      phone,
      role: 'agent',
      status: 'offline'
    });

    // Create target for today automatically
    const todayStr = new Date().toISOString().split('T')[0];
    await Target.create({
      agentId: newAgent.id,
      targetCalls: 150,
      targetDate: todayStr
    });

    res.status(201).json({
      success: true,
      agent: {
        id: newAgent.id,
        name: newAgent.name,
        email: newAgent.email,
        phone: newAgent.phone,
        status: newAgent.status
      }
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update agent
// @route   PUT /api/agents/:id
// @access  Private (Admin Only)
exports.updateAgent = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const agent = await User.findByPk(req.params.id);

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    if (phone && phone !== agent.phone) {
      const phoneExists = await User.findOne({ where: { phone } });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: 'Phone number already in use by another agent' });
      }
    }

    agent.name = name || agent.name;
    agent.email = email || agent.email;
    agent.phone = phone || agent.phone;
    if (password) {
      agent.password = password;
    }

    await agent.save();

    res.status(200).json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone
      }
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete agent
// @route   DELETE /api/agents/:id
// @access  Private (Admin Only)
exports.deleteAgent = async (req, res) => {
  try {
    const agent = await User.findByPk(req.params.id);

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    await agent.destroy();
    res.status(200).json({ success: true, message: 'Agent removed' });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Set agent calling target
// @route   POST /api/agents/:id/target
// @access  Private (Admin Only)
exports.setTarget = async (req, res) => {
  const { targetCalls } = req.body;
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const agent = await User.findByPk(req.params.id);
    if (!agent || agent.role !== 'agent') {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    let target = await Target.findOne({
      where: {
        agentId: agent.id,
        targetDate: todayStr
      }
    });

    if (target) {
      target.targetCalls = targetCalls;
      await target.save();
    } else {
      target = await Target.create({
        agentId: agent.id,
        targetCalls,
        targetDate: todayStr
      });
    }

    res.status(200).json({ success: true, target });
  } catch (error) {
    console.error('Set target error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
