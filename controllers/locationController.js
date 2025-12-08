// controllers/locationController.js

const TravelPlan = require("../models/locationModel");
const User = require("../models/User");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const UserSubscription = require("../models/UserSubscription");
const { Op } = require("sequelize");

const sendResponse = (res, statusCode, success, message, data = null) =>
  res.status(statusCode).json({ success, message, data });

// Helper: get active subscription
async function getActivePlanForUser(userId) {
  return await UserSubscription.findOne({
    where: { userId, status: "active" },
    include: [{ model: SubscriptionPlan, as: "plan" }],
  });
}

// Helper: stops parser
function parseStops(stops) {
  if (!stops) return null;

  let stopsArray = null;

  if (Array.isArray(stops)) {
    stopsArray = stops;
  } else if (typeof stops === "string") {
    stopsArray = stops
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  if (!stopsArray || !stopsArray.length) return null;
  if (stopsArray.length > 4) stopsArray = stopsArray.slice(0, 4);

  return stopsArray;
}

/* ============================================================
   CREATE NEW TRAVEL PLAN
   POST /api/locations
============================================================ */
exports.createTravelPlan = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (role !== "tradesman")
      return sendResponse(res, 403, false, "Only tradesmen can create plans");

    const {
      currentLocation,
      startLocation,
      destination,
      priceRange,
      allowStops,
      stops,
      startDate,
      endDate,
    } = req.body;

    if (!startLocation || !destination)
      return sendResponse(res, 400, false, "startLocation & destination are required");

    const activeSub = await getActivePlanForUser(userId);
    if (!activeSub)
      return sendResponse(res, 403, false, "Please purchase a subscription");

    const maxShared = activeSub.plan.maxSharedLocations;

    if (maxShared !== null && maxShared !== undefined) {
      const count = await TravelPlan.count({ where: { tradesmanId: userId } });
      if (count >= maxShared) {
        return sendResponse(
          res,
          403,
          false,
          `Limit reached (${maxShared}). Upgrade your plan`
        );
      }
    }

    const plan = await TravelPlan.create({
      tradesmanId: userId,
      currentLocation,
      startLocation,
      destination,
      priceRange,
      allowStops,
      stops: parseStops(stops),
      startDate,
      endDate,
    });

    return sendResponse(res, 201, true, "Travel plan created", plan);
  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, false, "Server error");
  }
};

/* ============================================================
   MY TRAVEL PLANS
   GET /api/locations/my
============================================================ */
exports.getMyTravelPlans = async (req, res) => {
  try {
    const userId = req.user?.id;

    const plans = await TravelPlan.findAll({
      where: { tradesmanId: userId },
      order: [["createdAt", "DESC"]],
    });

    return sendResponse(res, 200, true, "My travel plans fetched", plans);
  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, false, "Server error");
  }
};

/* ============================================================
   UPDATE TRAVEL PLAN
   PUT /api/locations/:id
============================================================ */
exports.updateTravelPlan = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const id = req.params.id;

    if (role !== "tradesman")
      return sendResponse(res, 403, false, "Only tradesmen can update");

    const plan = await TravelPlan.findByPk(id);
    if (!plan) return sendResponse(res, 404, false, "Travel plan not found");

    if (plan.tradesmanId !== userId)
      return sendResponse(res, 403, false, "Not allowed");

    const {
      currentLocation,
      startLocation,
      destination,
      priceRange,
      allowStops,
      stops,
      startDate,
      endDate,
      status,
    } = req.body;

    if (currentLocation !== undefined) plan.currentLocation = currentLocation;
    if (startLocation !== undefined) plan.startLocation = startLocation;
    if (destination !== undefined) plan.destination = destination;
    if (priceRange !== undefined) plan.priceRange = priceRange;
    if (allowStops !== undefined) plan.allowStops = allowStops;
    if (stops !== undefined) plan.stops = parseStops(stops);
    if (startDate !== undefined) plan.startDate = startDate;
    if (endDate !== undefined) plan.endDate = endDate;

    if (status && ["open", "closed", "cancelled"].includes(status)) {
      plan.status = status;
    }

    await plan.save();

    return sendResponse(res, 200, true, "Travel plan updated", plan);
  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, false, "Server error");
  }
};

/* ============================================================
   DELETE TRAVEL PLAN
   DELETE /api/locations/:id
============================================================ */
exports.deleteTravelPlan = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const id = req.params.id;

    if (role !== "tradesman")
      return sendResponse(res, 403, false, "Only tradesmen can delete");

    const plan = await TravelPlan.findByPk(id);
    if (!plan) return sendResponse(res, 404, false, "Travel plan not found");

    if (plan.tradesmanId !== userId)
      return sendResponse(res, 403, false, "Not allowed");

    await plan.destroy();

    return sendResponse(res, 200, true, "Travel plan deleted");
  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, false, "Server error");
  }
};
