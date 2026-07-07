const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Dnc = sequelize.define('Dnc', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  addedBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

module.exports = Dnc;
