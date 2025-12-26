// models/reviewModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Review = sequelize.define("Review", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  hireId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  fromUserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  toUserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  rating: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  comment: {
    type: DataTypes.TEXT
  },

  role: {
    type: DataTypes.ENUM("client", "tradesman"),
    allowNull: false
  }

}, {
  tableName: "reviews",
  timestamps: true
});

module.exports = Review;
