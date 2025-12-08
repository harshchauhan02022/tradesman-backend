// models/hireModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Hire = sequelize.define('Hire', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' }
  },

  tradesmanId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' }
  },

  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },

  jobDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'hires',
  timestamps: true
});

Hire.belongsTo(User, { as: 'client', foreignKey: 'clientId' });
Hire.belongsTo(User, { as: 'tradesman', foreignKey: 'tradesmanId' });

User.hasMany(Hire, { as: 'clientJobs', foreignKey: 'clientId' });
User.hasMany(Hire, { as: 'tradesmanJobs', foreignKey: 'tradesmanId' });

module.exports = Hire;
