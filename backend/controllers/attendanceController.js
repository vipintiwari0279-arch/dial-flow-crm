const { Attendance, User } = require('../models');
const { Op } = require('sequelize');

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// @desc    Punch In Agent (mark attendance with geolocation)
// @route   POST /api/attendance/punch-in
// @access  Private (Agent Only)
exports.punchIn = async (req, res) => {
  const agentId = req.user.id;
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, message: 'Location coordinates are required.' });
  }

  try {
    const { start, end } = getTodayRange();

    // Check if already punched in today
    const existing = await Attendance.findOne({
      where: {
        agentId,
        punchInTime: { [Op.between]: [start, end] }
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already punched in today.' });
    }

    const attendance = await Attendance.create({
      agentId,
      punchInTime: new Date(),
      latitude,
      longitude,
      status: 'present'
    });

    res.status(200).json({
      success: true,
      message: 'Successfully punched in for today.',
      attendance
    });
  } catch (error) {
    console.error('Punch in error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Punch Out Agent
// @route   POST /api/attendance/punch-out
// @access  Private (Agent Only)
exports.punchOut = async (req, res) => {
  const agentId = req.user.id;

  try {
    const { start, end } = getTodayRange();

    // Find today's active punch-in record
    const attendance = await Attendance.findOne({
      where: {
        agentId,
        punchInTime: { [Op.between]: [start, end] },
        punchOutTime: null
      }
    });

    if (!attendance) {
      return res.status(400).json({ success: false, message: 'Active punch-in record not found for today.' });
    }

    attendance.punchOutTime = new Date();
    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Successfully punched out.',
      attendance
    });
  } catch (error) {
    console.error('Punch out error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get current agent's attendance status for today
// @route   GET /api/attendance/today
// @access  Private (Agent Only)
exports.getTodayStatus = async (req, res) => {
  const agentId = req.user.id;

  try {
    const { start, end } = getTodayRange();

    const attendance = await Attendance.findOne({
      where: {
        agentId,
        punchInTime: { [Op.between]: [start, end] }
      }
    });

    res.status(200).json({
      success: true,
      punchedIn: !!attendance,
      punchedOut: attendance ? !!attendance.punchOutTime : false,
      attendance
    });
  } catch (error) {
    console.error('Get today status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all attendance logs (Admin view)
// @route   GET /api/attendance
// @access  Private (Admin Only)
exports.getAllAttendance = async (req, res) => {
  try {
    const logs = await Attendance.findAll({
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['punchInTime', 'DESC']]
    });

    res.status(200).json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
