const { Lead, Call } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

// @desc    Get dashboard metrics and chart data
// @route   GET /api/analytics/dashboard
// @access  Private (Admin Only)
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Core Card Metrics
    const totalLeads = await Lead.count();
    const totalCalled = await Lead.count({ where: { status: 'called' } });

    const connected = await Call.count({
      where: {
        disposition: { [Op.in]: ['interested', 'not_interested', 'callback'] }
      }
    });

    const notInterested = await Call.count({ where: { disposition: 'not_interested' } });
    const callback = await Call.count({ where: { disposition: 'callback' } });

    // 2. Disposition Summary (Pie Chart)
    const dispositionCounts = await Call.findAll({
      attributes: [
        'disposition',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['disposition']
    });

    const dispositionStats = {
      interested: 0,
      not_interested: 0,
      callback: 0,
      dnc: 0,
      wrong_number: 0,
      others: 0
    };

    dispositionCounts.forEach(item => {
      const disp = item.getDataValue('disposition');
      const count = parseInt(item.getDataValue('count'), 10);
      if (dispositionStats[disp] !== undefined) {
        dispositionStats[disp] = count;
      } else {
        dispositionStats.others += count;
      }
    });

    // 3. Calls Overview (This Week - Last 7 Days)
    const weeklyData = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const totalCalls = await Call.count({
        where: {
          createdAt: { [Op.between]: [start, end] }
        }
      });

      const connectedCalls = await Call.count({
        where: {
          createdAt: { [Op.between]: [start, end] },
          disposition: { [Op.in]: ['interested', 'not_interested', 'callback'] }
        }
      });

      // Format date name (e.g. "13 May")
      const day = date.getDate();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];

      weeklyData.push({
        label: `${day} ${month}`,
        totalCalls,
        connectedCalls
      });
    }

    res.status(200).json({
      success: true,
      metrics: {
        totalLeads,
        totalCalled,
        connected,
        notInterested,
        callback
      },
      dispositionSummary: dispositionStats,
      weeklyCallsOverview: weeklyData
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
