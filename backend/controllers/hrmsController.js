const { LeaveRequest, User } = require('../models');
const { Op } = require('sequelize');

// Helper to calculate calendar days between two dates inclusive
const calculateDays = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// @desc    Apply for leave
// @route   POST /api/hrms/leave
// @access  Private
exports.applyLeave = async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;

  try {
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Please provide all details' });
    }

    if (!['sick', 'casual', 'earned'].includes(leaveType)) {
      return res.status(400).json({ success: false, message: 'Invalid leave type' });
    }

    const days = calculateDays(startDate, endDate);
    if (days <= 0) {
      return res.status(400).json({ success: false, message: 'End date must be after or equal to start date' });
    }

    const user = await User.findByPk(req.user.id);
    let balance = 0;
    if (leaveType === 'sick') balance = user.sickLeaveBalance;
    if (leaveType === 'casual') balance = user.casualLeaveBalance;
    if (leaveType === 'earned') balance = user.earnedLeaveBalance;

    if (balance < days) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient leave balance. Requested: ${days} days, Available: ${balance} days` 
      });
    }

    const request = await LeaveRequest.create({
      userId: req.user.id,
      leaveType,
      startDate,
      endDate,
      reason,
      status: 'pending'
    });

    res.status(201).json({ success: true, message: 'Leave application submitted successfully', request });
  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get leave requests
// @route   GET /api/hrms/leave
// @access  Private
exports.getLeaves = async (req, res) => {
  try {
    let leaves;
    if (req.user.role === 'admin') {
      // Admin gets all leave requests with agent details
      leaves = await LeaveRequest.findAll({
        order: [['createdAt', 'DESC']],
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }]
      });
    } else {
      // Agents get only their own
      leaves = await LeaveRequest.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']]
      });
    }

    res.status(200).json({ success: true, leaves });
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Approve/Reject leave request
// @route   PUT /api/hrms/leave/:id/status
// @access  Private (Admin Only)
exports.updateLeaveStatus = async (req, res) => {
  const { status } = req.body; // 'approved' or 'rejected'

  try {
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const leave = await LeaveRequest.findByPk(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Leave request has already been processed' });
    }

    const user = await User.findByPk(leave.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Agent associated with this leave not found' });
    }

    if (status === 'approved') {
      const days = calculateDays(leave.startDate, leave.endDate);
      
      // Deduct leaves
      if (leave.leaveType === 'sick') {
        user.sickLeaveBalance = Math.max(0, user.sickLeaveBalance - days);
      } else if (leave.leaveType === 'casual') {
        user.casualLeaveBalance = Math.max(0, user.casualLeaveBalance - days);
      } else if (leave.leaveType === 'earned') {
        user.earnedLeaveBalance = Math.max(0, user.earnedLeaveBalance - days);
      }
      
      await user.save();
    }

    leave.status = status;
    leave.approvedBy = req.user.id;
    await leave.save();

    res.status(200).json({ success: true, message: `Leave request ${status} successfully`, leave });
  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Admin upload document links for agent
// @route   PUT /api/hrms/agent/:id/documents
// @access  Private (Admin Only)
exports.updateAgentDocuments = async (req, res) => {
  const { offerLetterUrl, relievingLetterUrl } = req.body;

  try {
    const user = await User.findByPk(req.params.id);
    if (!user || user.role !== 'agent') {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    user.offerLetterUrl = offerLetterUrl !== undefined ? offerLetterUrl : user.offerLetterUrl;
    user.relievingLetterUrl = relievingLetterUrl !== undefined ? relievingLetterUrl : user.relievingLetterUrl;
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: 'Agent documents updated successfully', 
      user: {
        id: user.id,
        name: user.name,
        offerLetterUrl: user.offerLetterUrl,
        relievingLetterUrl: user.relievingLetterUrl
      }
    });
  } catch (error) {
    console.error('Update documents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
