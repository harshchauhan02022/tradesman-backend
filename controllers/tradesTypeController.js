const { Op } = require("sequelize");
const TradesType = require("../models/tradesTypeModel");

const sendResponse = (res, status, success, message, data = []) =>
  res.status(status).json({ success, message, data });

/**
 * ✅ GET ALL TRADES
 * GET /api/trades
 */
exports.getAllTrades = async (req, res) => {
  try {
    const trades = await TradesType.findAll({
      where: { isActive: true },
      order: [["name", "ASC"]]
    });

    return sendResponse(res, 200, true, "Trades fetched", trades);
  } catch (err) {
    console.error("getAllTrades error:", err);
    return sendResponse(res, 500, false, "Server error");
  }
};

/**
 * ✅ SEARCH TRADES (NAME + CATEGORY)
 * GET /api/trades/search?q=plumber
 * GET /api/trades/search?category=Construction
 * GET /api/trades/search?q=ele&category=Construction
 */
exports.searchTrades = async (req, res) => {
  try {
    const { q, category } = req.query;

    const where = { isActive: true };

    if (q) {
      where.name = {
        [Op.like]: `%${q}%`
      };
    }

    if (category) {
      where.category = {
        [Op.like]: `%${category}%`
      };
    }

    const trades = await TradesType.findAll({
      where,
      order: [["name", "ASC"]]
    });

    return sendResponse(res, 200, true, "Search result", trades);
  } catch (err) {
    console.error("searchTrades error:", err);
    return sendResponse(res, 500, false, "Server error");
  }
};
