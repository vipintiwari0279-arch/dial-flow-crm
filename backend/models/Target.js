const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Target = sequelize.define('Target', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  targetCalls: {
    type: DataTypes.INTEGER,
    defaultValue: 150
  },
  targetDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
});

module.exports = Target;
