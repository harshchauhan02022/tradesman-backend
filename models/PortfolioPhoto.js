module.exports = (sequelize, DataTypes) => {
    return sequelize.define("PortfolioPhoto", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        image: { type: DataTypes.STRING, allowNull: false }
    });
};
