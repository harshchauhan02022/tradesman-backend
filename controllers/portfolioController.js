const TradesmanDetails = require("../models/TradesmanDetails");

const sendResponse = (res, status, success, message, data = null) =>
  res.status(status).json({ success, message, data });

exports.addPortfolioPhotos = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.files || req.files.length === 0) {
      return sendResponse(res, 400, false, "No photos uploaded");
    }

    const tradesman = await TradesmanDetails.findOne({
      where: { userId }
    });

    if (!tradesman) {
      return sendResponse(res, 404, false, "Tradesman details not found");
    }

    const existingPhotos = tradesman.portfolioPhotos || [];

    if (existingPhotos.length + req.files.length > 10) {
      return sendResponse(res, 400, false, "Max 10 portfolio photos allowed");
    }

    // diskStorage already saved files
    const newPhotos = req.files.map(
      file => `/uploads/portfolio/${file.filename}`
    );

    tradesman.portfolioPhotos = [...existingPhotos, ...newPhotos];
    await tradesman.save();

    return sendResponse(
      res,
      200,
      true,
      "Portfolio photos added",
      tradesman.portfolioPhotos
    );

  } catch (err) {
    console.error(err);
    return sendResponse(res, 500, false, "Server error");
  }
};

exports.getMyPortfolio = async (req, res) => {
  try {
    const userId = req.user.id;

    const tradesman = await TradesmanDetails.findOne({
      where: { userId }
    });

    if (!tradesman) {
      return sendResponse(res, 404, false, "Tradesman details not found");
    }

    return sendResponse(
      res,
      200,
      true,
      "Portfolio fetched",
      tradesman.portfolioPhotos || []
    );

  } catch (err) {
    return sendResponse(res, 500, false, "Server error");
  }
};

exports.deletePortfolioPhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    const index = parseInt(req.params.index);

    const tradesman = await TradesmanDetails.findOne({
      where: { userId }
    });

    if (!tradesman) {
      return sendResponse(res, 404, false, "Tradesman details not found");
    }

    const photos = tradesman.portfolioPhotos || [];

    if (isNaN(index) || index < 0 || index >= photos.length) {
      return sendResponse(res, 400, false, "Invalid photo index");
    }

    photos.splice(index, 1);
    tradesman.portfolioPhotos = photos;
    await tradesman.save();

    return sendResponse(
      res,
      200,
      true,
      "Portfolio photo deleted",
      photos
    );

  } catch (err) {
    return sendResponse(res, 500, false, "Server error");
  }
};
