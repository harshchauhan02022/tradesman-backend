// models/reviewModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");
const Hire = require("./hireModel");

const Review = sequelize.define(
    "Review",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },

        hireId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "hires", key: "id" },
        },

        fromUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "Users", key: "id" },
        },

        toUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "Users", key: "id" },
        },

        rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        comment: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        jobDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
    },
    {
        tableName: "reviews",
        timestamps: true,
    }
);

// associations
Review.belongsTo(Hire, { as: "hire", foreignKey: "hireId" });
Hire.hasOne(Review, { as: "review", foreignKey: "hireId" });

Review.belongsTo(User, { as: "fromUser", foreignKey: "fromUserId" });
Review.belongsTo(User, { as: "toUser", foreignKey: "toUserId" });

module.exports = Review;
