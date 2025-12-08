// models/locationModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");

const TravelPlan = sequelize.define(
  "TravelPlan",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    tradesmanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Users", key: "id" },
    },

    currentLocation: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    startLocation: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    destination: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    priceRange: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    allowStops: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    stops: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("open", "closed", "cancelled"),
      defaultValue: "open",
    },
  },
  {
    tableName: "travelplans",
    timestamps: true,
  }
);

TravelPlan.belongsTo(User, { as: "tradesman", foreignKey: "tradesmanId" });
User.hasMany(TravelPlan, { as: "travelPlans", foreignKey: "tradesmanId" });

module.exports = TravelPlan;
