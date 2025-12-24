const express = require("express");
const router = express.Router();
const tradesTypeController = require("../controllers/tradesTypeController");

// ✅ Get all trades
router.get("/", tradesTypeController.getAllTrades);

// ✅ Search trades by name/category
router.get("/search", tradesTypeController.searchTrades);

module.exports = router;
