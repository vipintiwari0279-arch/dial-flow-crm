const { Lead, User, Dnc } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const csv = require('csv-parser');

// @desc    Upload leads from CSV file
// @route   POST /api/leads/upload
// @access  Private (Admin Only)
exports.uploadLeads = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a CSV file' });
  }

  const filePath = req.file.path;
  const leads = [];

  try {
    // Read and parse CSV
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Extract fields dynamically supporting both Capitalized and lowercase header names
        const name = row.Name || row.name || row.NAME || '';
        const phone = row.Phone || row.phone || row.PHONE || row.Mobile || row.mobile || '';
        const city = row.City || row.city || row.CITY || '';
        const state = row.State || row.state || row.STATE || '';

        if (phone) {
          leads.push({
            name: name.trim() || 'No Name',
            phone: phone.trim().replace(/[^0-9]/g, ''), // clean phone numbers to digits only
            city: city.trim(),
            state: state.trim(),
            status: 'pending'
          });
        }
      })
      .on('end', async () => {
        try {
          // Remove temp file
          fs.unlinkSync(filePath);

          // Get DNC list to filter
          const dncEntries = await Dnc.findAll({ attributes: ['phone'] });
          const dncPhones = new Set(dncEntries.map(d => d.phone));

          let importedCount = 0;
          let dncCount = 0;
          let duplicateCount = 0;

          // Insert leads bulk or sequentially to prevent duplicates in DB
          for (const lead of leads) {
            if (dncPhones.has(lead.phone)) {
              dncCount++;
              continue;
            }

            // Check if phone already exists in Leads table
            const exists = await Lead.findOne({ where: { phone: lead.phone } });
            if (exists) {
              duplicateCount++;
              continue;
            }

            await Lead.create(lead);
            importedCount++;
          }

          res.status(200).json({
            success: true,
            message: `CSV processed successfully.`,
            stats: {
              totalParsed: leads.length,
              imported: importedCount,
              duplicatesFiltered: duplicateCount,
              dncFiltered: dncCount
            }
          });
        } catch (dbError) {
          console.error('Database insertion error:', dbError);
          res.status(500).json({ success: false, message: 'Database insert error' });
        }
      })
      .on('error', (parseError) => {
        console.error('CSV Parsing error:', parseError);
        res.status(500).json({ success: false, message: 'CSV parse error' });
      });

  } catch (error) {
    console.error('Upload leads error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Distribute pending leads equally among online/paused agents (Round-Robin)
// @route   POST /api/leads/distribute
// @access  Private (Admin Only)
exports.distributeLeads = async (req, res) => {
  try {
    // 1. Get all online/paused/offline agents to participate or only online agents
    // Normally we distribute to active (online or paused) agents.
    const agents = await User.findAll({
      where: {
        role: 'agent',
        status: { [Op.in]: ['online', 'paused'] }
      }
    });

    if (agents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No online or paused agents available for lead distribution.'
      });
    }

    // 2. Find all pending leads
    const pendingLeads = await Lead.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'ASC']]
    });

    if (pendingLeads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending leads found to distribute.'
      });
    }

    let distributedCount = 0;
    // Round robin distribution
    for (let i = 0; i < pendingLeads.length; i++) {
      const lead = pendingLeads[i];
      const agent = agents[i % agents.length];

      lead.allocatedTo = agent.id;
      lead.status = 'allocated';
      await lead.save();
      distributedCount++;
    }

    // Emit live monitoring update socket
    const io = req.app.get('io');
    if (io) {
      io.emit('leads_distributed', { distributedCount });
    }

    res.status(200).json({
      success: true,
      message: `Successfully distributed ${distributedCount} leads among ${agents.length} agents.`
    });
  } catch (error) {
    console.error('Distribute leads error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all leads (admin view with filters)
// @route   GET /api/leads
// @access  Private (Admin Only)
exports.getLeads = async (req, res) => {
  const { status, disposition, search } = req.query;
  const whereClause = {};

  if (status) whereClause.status = status;
  if (disposition) whereClause.disposition = disposition;

  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { city: { [Op.like]: `%${search}%` } }
    ];
  }

  try {
    const leads = await Lead.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 100 // Cap results
    });

    res.status(200).json({ success: true, leads });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get current lead and next allocated lead for agent
// @route   GET /api/leads/next
// @access  Private (Agent Only)
exports.getNextAgentLead = async (req, res) => {
  const agentId = req.user.id;

  try {
    // Check if agent already has an active lead assigned in User model
    let lead = null;
    if (req.user.currentLeadId) {
      lead = await Lead.findByPk(req.user.currentLeadId);
    }

    // If no active lead or the active lead is already called, find the next allocated lead
    if (!lead || lead.status === 'called') {
      lead = await Lead.findOne({
        where: {
          allocatedTo: agentId,
          status: 'allocated'
        },
        order: [['createdAt', 'ASC']]
      });

      if (lead) {
        // Save as current active lead for this agent
        req.user.currentLeadId = lead.id;
        await req.user.save();
      } else {
        // No allocated leads left
        req.user.currentLeadId = null;
        await req.user.save();
      }
    }

    // Get stats for today for target tracking
    const todayStr = new Date().toISOString().split('T')[0];
    const target = await Target.findOne({
      where: { agentId, targetDate: todayStr }
    });

    const { start, end } = getTodayRangeHelper();
    const totalCalls = await Lead.count({
      where: {
        allocatedTo: agentId,
        status: 'called',
        updatedAt: { [Op.between]: [start, end] }
      }
    });

    res.status(200).json({
      success: true,
      lead,
      target: target ? target.targetCalls : 150,
      completedToday: totalCalls
    });
  } catch (error) {
    console.error('Get next lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper inside leadController for local ranges
const getTodayRangeHelper = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// @desc    Get callback leads for admin
// @route   GET /api/leads/callbacks
// @access  Private (Admin or Agent)
exports.getCallbacks = async (req, res) => {
  try {
    const whereClause = { disposition: 'callback' };

    // If agent, only show their callbacks
    if (req.user.role === 'agent') {
      whereClause.allocatedTo = req.user.id;
    }

    const callbacks = await Lead.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name']
        }
      ],
      order: [['callbackTime', 'ASC']]
    });

    res.status(200).json({ success: true, callbacks });
  } catch (error) {
    console.error('Get callbacks error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
