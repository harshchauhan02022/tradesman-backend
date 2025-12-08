// routes/locationRoutes.js

const express = require("express");
const router = express.Router();
const travelPlanController = require("../controllers/locationController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Create
router.post("/", verifyToken, travelPlanController.createTravelPlan);

// My travel plans
router.get("/my", verifyToken, travelPlanController.getMyTravelPlans);

// Update
router.put("/:id", verifyToken, travelPlanController.updateTravelPlan);

// Delete
router.delete("/:id", verifyToken, travelPlanController.deleteTravelPlan);

module.exports = router;
