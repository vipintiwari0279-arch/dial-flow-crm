const { Call, Lead, Dnc, User } = require('../models');

// @desc    Log a finished call and save disposition details
// @route   POST /api/calls/log
// @access  Private (Agent Only)
exports.logCall = async (req, res) => {
  const { leadId, duration, disposition, notes, callbackTime, leadName, phone } = req.body;
  const agentId = req.user.id;

  try {
    if (!leadId || !disposition) {
      return res.status(400).json({ success: false, message: 'Lead ID and Disposition are required.' });
    }

    let lead;
    if (String(leadId).startsWith('manual_')) {
      const cleanPhone = String(phone || leadId.split('_')[1] || '').replace(/[^0-9]/g, '');
      if (!cleanPhone) {
        return res.status(400).json({ success: false, message: 'Phone number is required for reference call log.' });
      }

      lead = await Lead.findOne({ where: { phone: cleanPhone } });
      if (!lead) {
        lead = await Lead.create({
          name: leadName || 'Reference Lead',
          phone: cleanPhone,
          city: 'Manual Dial',
          state: 'Reference',
          status: 'called',
          allocatedTo: agentId
        });
      }
    } else {
      lead = await Lead.findByPk(leadId);
    }

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    // 1. Create Call Log
    const newCall = await Call.create({
      leadId: lead.id,
      agentId,
      duration: duration || 0,
      disposition,
      notes
    });

    // 2. Update Lead values
    lead.status = 'called';
    lead.disposition = disposition;
    lead.notes = notes;
    if (disposition === 'callback' && callbackTime) {
      lead.callbackTime = new Date(callbackTime);
    } else {
      lead.callbackTime = null;
    }
    await lead.save();

    // 3. Handle DNC Compliance
    if (disposition === 'dnc') {
      const dncExists = await Dnc.findOne({ where: { phone: lead.phone } });
      if (!dncExists) {
        await Dnc.create({
          phone: lead.phone,
          addedBy: agentId
        });
      }
      // Auto-update all matching leads in database to prevent dialing them again
      await Lead.update(
        { status: 'called', disposition: 'dnc', notes: 'Auto-blocked: Number added to DNC bucket' },
        { where: { phone: lead.phone } }
      );
    }

    // 4. Clear current agent active lead reference
    req.user.currentLeadId = null;
    await req.user.save();

    // 5. Broadcast to Socket.io for live dashboard updates
    const io = req.app.get('io');
    if (io) {
      // Emit call logged event with data
      io.emit('call_logged', {
        agentId,
        agentName: req.user.name,
        leadName: lead.name,
        phone: lead.phone,
        duration,
        disposition,
        notes
      });
    }

    res.status(201).json({
      success: true,
      message: 'Call logged successfully',
      call: newCall
    });
  } catch (error) {
    console.error('Log call error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all call logs
// @route   GET /api/calls
// @access  Private (Admin Only)
exports.getCalls = async (req, res) => {
  try {
    const calls = await Call.findAll({
      include: [
        {
          model: Lead,
          as: 'lead',
          attributes: ['id', 'name', 'phone', 'city', 'state']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    res.status(200).json({ success: true, calls });
  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get DNC list
// @route   GET /api/calls/dnc
// @access  Private (Admin or Agent)
exports.getDncList = async (req, res) => {
  try {
    const list = await Dnc.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, dncList: list });
  } catch (error) {
    console.error('Get DNC list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add number directly to DNC list
// @route   POST /api/calls/dnc
// @access  Private (Admin or Agent)
exports.addToDnc = async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  try {
    const cleaned = phone.replace(/[^0-9]/g, '');
    const dncExists = await Dnc.findOne({ where: { phone: cleaned } });

    if (dncExists) {
      return res.status(400).json({ success: false, message: 'Phone number already in DNC list' });
    }

    const dnc = await Dnc.create({
      phone: cleaned,
      addedBy: req.user.id
    });

    // Auto-update all matching leads in database to prevent dialing them again
    await Lead.update(
      { status: 'called', disposition: 'dnc', notes: 'Auto-blocked: Number manually blacklisted' },
      { where: { phone: cleaned } }
    );

    res.status(201).json({ success: true, dnc });
  } catch (error) {
    console.error('Add to DNC error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
