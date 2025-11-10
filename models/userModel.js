const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },  
  mobile: {
    type: DataTypes.STRING
  },
  password: {
    type: DataTypes.STRING
  },
  role: {
    type: DataTypes.ENUM('tradesman', 'client', 'admin'),
    defaultValue: 'tradesman'
  },
  profileImage: {
    type: DataTypes.STRING
  },
  tradeType: {
    type: DataTypes.STRING
  },
  businessName: {
    type: DataTypes.STRING
  },
  shortBio: {
    type: DataTypes.TEXT
  },
  licenseNumber: {
    type: DataTypes.STRING
  },
  licenseExpiry: {
    type: DataTypes.DATE
  },
  licenseDocument: {
    type: DataTypes.STRING
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resetPasswordToken: {
    type: DataTypes.STRING
  },
  resetPasswordExpires: {
    type: DataTypes.DATE
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profilePic: {
    type: DataTypes.STRING,
    allowNull: true
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'manual'
  }
}, {
  timestamps: true,
  tableName: 'Users',
});

module.exports = User;
