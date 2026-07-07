const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'allocated', 'called'),
    defaultValue: 'pending'
  },
  allocatedTo: {
    type: DataTypes.UUID,
    allowNull: true
  },
  disposition: {
    type: DataTypes.ENUM('interested', 'not_interested', 'callback', 'dnc', 'wrong_number', 'others'),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  callbackTime: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = Lead;
