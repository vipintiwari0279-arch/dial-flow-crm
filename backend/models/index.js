const sequelize = require('../config/db');
const User = require('./User');
const Lead = require('./Lead');
const Call = require('./Call');
const Dnc = require('./Dnc');
const Target = require('./Target');
const Attendance = require('./Attendance');

// Relationships

// Agent - Lead relationship
User.hasMany(Lead, { foreignKey: 'allocatedTo', as: 'allocatedLeads' });
Lead.belongsTo(User, { foreignKey: 'allocatedTo', as: 'agent' });

// Agent - Call relationship
User.hasMany(Call, { foreignKey: 'agentId', as: 'calls' });
Call.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });

// Lead - Call relationship
Lead.hasMany(Call, { foreignKey: 'leadId', as: 'calls' });
Call.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });

// Agent - Target relationship
User.hasMany(Target, { foreignKey: 'agentId', as: 'targets' });
Target.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });

// DNC - User relationship
User.hasMany(Dnc, { foreignKey: 'addedBy', as: 'addedDncs' });
Dnc.belongsTo(User, { foreignKey: 'addedBy', as: 'creator' });

// Agent - Attendance relationship
User.hasMany(Attendance, { foreignKey: 'agentId', as: 'attendances' });
Attendance.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });

module.exports = {
  sequelize,
  User,
  Lead,
  Call,
  Dnc,
  Target,
  Attendance
};
