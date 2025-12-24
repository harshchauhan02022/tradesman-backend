const User = require('../models/User');
const TradesmanDetails = require("../models/TradesmanDetails");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const UserSubscription = require("../models/UserSubscription"); 
const Hire = require("../models/hireModel");
const Review = require("../models/reviewModel");

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const crypto = require('crypto');
const transporter = require('../config/email');
require('dotenv').config();

const sendResponse = (res, statusCode, success, message, data = null, error = null) => {
  return res.status(statusCode).json({ success, message, data, error });
};

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Helper to parse pagination query params
 */
const parsePagination = (req) => {
  let page = parseInt(req.query.page, 10) || 1;
  let limit = parseInt(req.query.limit, 10) || 10;
  const maxLimit = 100;

  if (page < 1) page = 1;
  if (limit < 1) limit = 10;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Helper to shape paginated response
 */
const paginatedResponse = (res, message, result, page, limit) => {
  const total = result.count ?? (Array.isArray(result) ? result.length : 0);
  const rows = result.rows ?? result;
  const totalPages = limit ? Math.ceil(total / limit) : 1;

  return sendResponse(res, 200, true, message, {
    meta: {
      total,
      page,
      perPage: limit,
      totalPages,
    },
    data: rows,
  });
};

exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      password,
      role,              // "tradesman" | "client"

      // Tradesman-only text fields
      tradeType,
      businessName,
      shortBio,
      licenseNumber,
      licenseExpiry,
      portfolioDescription,
    } = req.body;

    // 👇 Files from multer
    const profileImageFile = req.files?.profileImage?.[0] || null;
    const licenseDocFile = req.files?.licenseDocument?.[0] || null;
    const portfolioFiles = req.files?.portfolioPhotos || [];

    // 1) Email already exist?
    const isExist = await User.findOne({ where: { email } });
    if (isExist) {
      return sendResponse(res, 400, false, "User already exists");
    }

    // 2) Tradesman required fields + files
    if (role === "tradesman") {
      if (!tradeType || !businessName || !shortBio) {
        return sendResponse(res, 400, false, "tradeType, businessName, shortBio required for tradesman");
      }
      if (!licenseNumber || !licenseExpiry) {
        return sendResponse(res, 400, false, "licenseNumber & licenseExpiry required for tradesman");
      }
      if (!profileImageFile) {
        return sendResponse(res, 400, false, "profileImage file is required for tradesman");
      }
      if (!licenseDocFile) {
        return sendResponse(res, 400, false, "licenseDocument file is required for tradesman");
      }
      if (!portfolioFiles.length) {
        return sendResponse(res, 400, false, "At least one portfolioPhotos file is required for tradesman");
      }
    }

    // 3) Password hash
    const hashedPass = await bcrypt.hash(password, 10);

    // 4) User create (profileImage = filename)
    const user = await User.create({
      name,
      email,
      mobile,
      password: hashedPass,
      role,
      profileImage: profileImageFile ? profileImageFile.filename : null,
    });

    // 5) TradesmanDetails create (licenseDocument + portfolioPhotos array)
    if (role === "tradesman") {
      const portfolioPhotos = portfolioFiles.map((f) => f.filename);

      await TradesmanDetails.create({
        userId: user.id,
        tradeType,
        businessName,
        shortBio,
        licenseNumber,
        licenseExpiry,
        licenseDocument: licenseDocFile.filename,
        portfolioPhotos,
        portfolioDescription,
      });

      // 6) Default subscription: Free Trial
      const freePlan = await SubscriptionPlan.findOne({
        where: { isDefault: true },
      });

      if (freePlan) {
        await UserSubscription.create({
          userId: user.id,
          planId: freePlan.id,
          startDate: new Date(),
          status: "active",
        });
      }
    }

    return sendResponse(res, 201, true, "User registered successfully", user);
  } catch (error) {
    console.error("Register Error:", error);
    return sendResponse(res, 500, false, "Server error");
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    return sendResponse(res, 500, false, "Server error");
  }
};

/**
 * GET /api/users
 * Supports pagination and optional search & role filter:
 * ?page=1&limit=10&search=deepak&role=tradesman
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const { search, role } = req.query;

    const where = {};
    if (role) where.role = role;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } }, // For Postgres; with other DBs use Op.substring or adjust as needed
        { email: { [Op.iLike]: `%${search}%` } },
        { mobile: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // use findAndCountAll for pagination metadata
    const result = await User.findAndCountAll({
      where,
      include: [{ model: TradesmanDetails, as: "TradesmanDetail" }],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return paginatedResponse(res, "Users fetched", result, page, limit);
  } catch (error) {
    console.error("Fetch Users Error:", error);
    return sendResponse(res, 500, false, "Server error");
  }
};

/**
 * GET /api/users/tradesmen
 * Public: lists tradesmen with their TradesmanDetails
 * Supports pagination: ?page=1&limit=10
 * Optional filter: tradeType (e.g. ?tradeType=plumber)
 */
exports.getAllTradesmen = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const { tradeType, search } = req.query;

    const whereUser = { role: "tradesman" };

    // If search on user fields
    if (search) {
      whereUser[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { mobile: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filter on TradesmanDetails (tradeType)
    const tradesmanWhere = {};
    if (tradeType) tradesmanWhere.tradeType = tradeType;

    const result = await User.findAndCountAll({
      where: whereUser,
      include: [
        {
          model: TradesmanDetails,
          as: "TradesmanDetail",
          where: Object.keys(tradesmanWhere).length ? tradesmanWhere : undefined,
          required: false,
        },
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    if (!result || result.count === 0) {
      return sendResponse(res, 404, false, "No tradesmen found");
    }

    return paginatedResponse(res, "Tradesmen fetched", result, page, limit);
  } catch (error) {
    console.error("Fetch Tradesmen Error:", error);
    return sendResponse(res, 500, false, "Server error");
  }
};

/**
 * GET /api/users/clients
 * Public: lists clients (role = client)
 * Supports pagination ?page & ?limit
 */
exports.getAllClients = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const { search } = req.query;

    const where = { role: "client" };

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { mobile: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const result = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    if (!result || result.count === 0) {
      return sendResponse(res, 404, false, "No clients found");
    }

    return paginatedResponse(res, "Clients fetched", result, page, limit);
  } catch (error) {
    console.error("Fetch Clients Error:", error);
    return sendResponse(res, 500, false, "Server error");
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id },
      include: [{ model: TradesmanDetails, as: "TradesmanDetail" }],
    });

    if (!user) return sendResponse(res, 404, false, "User not found");

    return sendResponse(res, 200, true, "User fetched", user);
  } catch (error) {
    console.error("Fetch User Error:", error);
    return sendResponse(res, 500, false, "Server error");
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // 🔥 TOKEN SE ID

    const user = await User.findByPk(userId);
    if (!user)
      return sendResponse(res, 404, false, "User not found");

    const {
      name,
      email,
      mobile,
      password,
      tradeType,
      businessName,
      shortBio,
      licenseNumber,
      licenseExpiry,
      isApproved
    } = req.body;

    // -------- USERS TABLE (OPTIONAL FIELDS) --------
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // 🖼 PROFILE IMAGE (OPTIONAL)
    if (req.file) {
      user.profileImage = `${req.file.filename}`;
    }

    await user.save();

    // -------- TRADESMAN DETAILS (IF EXISTS) --------
    const tradesman = await TradesmanDetails.findOne({
      where: { userId }
    });

    if (tradesman) {
      if (tradeType !== undefined) tradesman.tradeType = tradeType;
      if (businessName !== undefined) tradesman.businessName = businessName;
      if (shortBio !== undefined) tradesman.shortBio = shortBio;
      if (licenseNumber !== undefined) tradesman.licenseNumber = licenseNumber;
      if (licenseExpiry !== undefined) tradesman.licenseExpiry = licenseExpiry;
      if (isApproved !== undefined) tradesman.isApproved = isApproved;

      await tradesman.save();
    }

    return sendResponse(res, 200, true, "Profile updated successfully", {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profileImage: user.profileImage
    });

  } catch (error) {
    console.error("Update Profile Error:", error);
    return sendResponse(res, 500, false, "Server error");
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) return sendResponse(res, 404, false, "User not found");

    await user.destroy();
    return sendResponse(res, 200, true, "User deleted successfully");

  } catch (error) {
    console.error("Delete Error:", error);
    return sendResponse(res, 500, false, "Server error");
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return sendResponse(res, 400, false, "Email is required");

    const user = await User.findOne({ where: { email } });
    if (!user) return sendResponse(res, 404, false, "User not found");

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await user.update({
      resetPasswordToken: token,
      resetPasswordExpires: expiry,
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    console.log("Reset Link:", resetLink);

    return sendResponse(res, 200, true, "Password reset link sent", resetLink);

  } catch (err) {
    console.error("Forgot Error:", err);
    return sendResponse(res, 500, false, "Server error");
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) return sendResponse(res, 400, false, "Invalid or expired token");

    const hashed = await bcrypt.hash(newPassword, 10);

    await user.update({
      password: hashed,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return sendResponse(res, 200, true, "Password reset successful");

  } catch (error) {
    console.error("Reset Error:", error);
    return sendResponse(res, 500, false, "Server error");
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmNewPassword)
      return sendResponse(res, 400, false, "All fields required");

    if (newPassword !== confirmNewPassword)
      return sendResponse(res, 400, false, "New password mismatch");

    const user = await User.findByPk(userId);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return sendResponse(res, 400, false, "Old password incorrect");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return sendResponse(res, 200, true, "Password changed successfully");

  } catch (error) {
    console.error("Change Password Error:", error);
    return sendResponse(res, 500, false, "Server error");
  }
};

// 👇 getMeProfile
exports.getMeProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, 401, false, "Unauthorized");
    }

    const user = await User.findOne({
      where: { id: userId },
      include: [{ model: TradesmanDetails, as: "TradesmanDetail" }],
    });

    if (!user) {
      return sendResponse(res, 404, false, "User not found");
    }

    return sendResponse(res, 200, true, "User fetched", user);
  } catch (error) {
    console.error("Fetch Me Error:", error);
    return sendResponse(res, 500, false, "Server error");
  }
};

exports.getFullUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    // 1️⃣ Fetch user & tradesman details if exist
    const user = await User.findOne({
      where: { id: userId },
      include: [
        { model: TradesmanDetails, as: "TradesmanDetail" }
      ]
    });

    if (!user) return sendResponse(res, 404, false, "User not found");

    // ─────────────────────────────────────────────
    // 2️⃣ FETCH JOB HISTORY
    // ─────────────────────────────────────────────

    let jobHistory = [];

    if (user.role === "tradesman") {
      // Tradesman → jobs he worked on
      const jobs = await Hire.findAll({
        where: { tradesmanId: userId, status: "completed" },
        include: [{ model: User, as: "client", attributes: ["name"] }],
        order: [["updatedAt", "DESC"]]
      });

      jobHistory = jobs.map(j => ({
        jobId: j.id,
        clientName: j.client?.name,
        jobDescription: j.jobDescription,
        date: j.updatedAt,
        status: j.status
      }));
    }

    if (user.role === "client") {
      // Client → jobs he requested
      const jobs = await Hire.findAll({
        where: { clientId: userId },
        include: [
          { model: User, as: "tradesman", attributes: ["name"] }
        ],
        order: [["createdAt", "DESC"]]
      });

      jobHistory = jobs.map(j => ({
        jobId: j.id,
        tradesmanName: j.tradesman?.name,
        jobDescription: j.jobDescription,
        status: j.status,
        date: j.updatedAt
      }));
    }

    // ─────────────────────────────────────────────
    // 3️⃣ REVIEWS
    // ─────────────────────────────────────────────

    const reviews = await Review.findAll({
      where: { toUserId: userId },
      include: [{ model: User, as: "fromUser", attributes: ["name"] }],
      order: [["createdAt", "DESC"]]
    });

    const formattedReviews = reviews.map(r => ({
      rating: r.rating,
      comment: r.comment,
      fromUser: r.fromUser?.name,
      jobDate: r.jobDate
    }));

    const avgRating = reviews.length
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    // ─────────────────────────────────────────────
    // 4️⃣ SUBSCRIPTION (Tradesman only)
    // ─────────────────────────────────────────────
    let subscription = null;

    if (user.role === "tradesman") {
      const sub = await UserSubscription.findOne({
        where: { userId, status: "active" },
        include: [{ model: SubscriptionPlan, as: "plan" }]
      });

      if (sub) {
        subscription = {
          planName: sub.plan?.name,
          status: sub.status,
          expiresOn: sub.endDate
        };
      }
    }

    // ─────────────────────────────────────────────
    // 5️⃣ FINAL RESPONSE
    // ─────────────────────────────────────────────

    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profileImage: user.profileImage,
      role: user.role,

      // Tradesman-only fields
      tradeType: user.TradesmanDetail?.tradeType || null,
      businessName: user.TradesmanDetail?.businessName || null,
      shortBio: user.TradesmanDetail?.shortBio || null,
      portfolioPhotos: user.TradesmanDetail?.portfolioPhotos || [],

      // Common
      jobHistory,
      reviews: formattedReviews,
      averageRating: avgRating,
      subscription
    };

    return sendResponse(res, 200, true, "Profile fetched", response);

  } catch (error) {
    console.error("Profile Error:", error);
    return sendResponse(res, 500, false, "Server error", null, error);
  }
};

exports.filterTradesmen = async (req, res) => {
  try {
    const {
      tradeType,
      lat,
      lng,
      radius = 40,
      rating,
      verified,
      availability
    } = req.query;

    let whereUser = { role: "tradesman" };
    let whereTrade = {};

    // 1️⃣ Trade Type Filter
    if (tradeType) {
      const trades = tradeType.split(",").map(t => t.trim());
      whereTrade.tradeType = { [Op.or]: trades };
    }

    // 2️⃣ Verified Tradesman
    if (verified === "true") {
      whereTrade.isApproved = true;
    }

    // 3️⃣ Availability filter
    if (availability === "today") {
      whereTrade.startDate = {
        [Op.lte]: new Date(),
      };
      whereTrade.endDate = {
        [Op.gte]: new Date(),
      };
    }

    // 4️⃣ Fetch all tradesmen with details
    let tradesmen = await User.findAll({
      where: whereUser,
      include: [
        {
          model: TradesmanDetails,
          as: "TradesmanDetail",
          where: whereTrade
        }
      ]
    });

    // 5️⃣ Rating Filter
    if (rating) {
      for (let t of tradesmen) {
        const agg = await Review.findOne({
          where: { toUserId: t.id },
          attributes: [
            [fn("AVG", col("rating")), "avgRating"]
          ]
        });

        t.dataValues.avgRating = agg?.dataValues?.avgRating || 0;
      }

      tradesmen = tradesmen.filter(t => t.dataValues.avgRating >= rating);
    }

    // 6️⃣ GPS Distance Filter (40 km radius)
    if (lat && lng) {
      const R = 6371; // Earth radius

      tradesmen = tradesmen.filter(t => {
        const location = t.TradesmanDetail.currentLocation;
        if (!location) return false;

        const [tLat, tLng] = location.split(",").map(Number);

        const dLat = (tLat - lat) * Math.PI / 180;
        const dLng = (tLng - lng) * Math.PI / 180;

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(lat * Math.PI / 180) *
            Math.cos(tLat * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance <= radius;
      });
    }

    return res.json({
      success: true,
      message: "Filtered tradesmen",
      data: tradesmen
    });

  } catch (err) {
    console.error("Filter Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


