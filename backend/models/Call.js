const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Call = sequelize.define('Call', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  leadId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // duration in seconds
    defaultValue: 0
  },
  disposition: {
    type: DataTypes.STRING,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recordingUrl: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = Call;
