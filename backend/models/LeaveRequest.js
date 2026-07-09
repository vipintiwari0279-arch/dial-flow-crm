const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LeaveRequest = sequelize.define('LeaveRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  leaveType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['sick', 'casual', 'earned']]
    }
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'approved', 'rejected']]
    }
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
});

module.exports = LeaveRequest;
