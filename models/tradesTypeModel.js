const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TradesType = sequelize.define(
  "TradesType",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    category: {
      type: DataTypes.STRING,
      allowNull: false
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    tableName: "trades_type", // ✅ EXACT DB TABLE NAME
    timestamps: true
  }
);

module.exports = TradesType;
