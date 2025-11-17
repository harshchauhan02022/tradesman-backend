const User = require('../models/User');
const TradesmanDetails = require("../models/TradesmanDetails");
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
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      password,
      role,

      // Tradesman-only fields
      tradeType,
      businessName,
      shortBio,
      licenseNumber,
      licenseExpiry,
      licenseDocument,
    } = req.body;

    // Check existing user
    const isExist = await User.findOne({ where: { email } });
    if (isExist) {
      return sendResponse(res, 400, false, "User already exists");
    }

    // Hash password
    const hashedPass = await bcrypt.hash(password, 10);

    // Create user in Users table
    const user = await User.create({
      name,
      email,
      mobile,
      password: hashedPass,
      role,
    });

    // If Tradesman => Create TradesmanDetails row
    if (role === "tradesman") {
      await TradesmanDetails.create({
        userId: user.id,
        tradeType,
        businessName,
        shortBio,
        licenseNumber,
        licenseExpiry,
        licenseDocument,
      });
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
    if (!user) return sendResponse(res, 400, false, "Invalid email or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return sendResponse(res, 400, false, "Invalid email or password");

    const token = signToken(user);

    return sendResponse(res, 200, true, "Login successful", {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    return sendResponse(res, 500, false, "Server error");
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    return sendResponse(res, 200, true, "Users fetched", users);
  } catch (error) {
    console.error("Fetch Users Error:", error);
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

exports.updateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      password,
      role,
      tradeType,
      businessName,
      shortBio,
      licenseNumber,
      licenseExpiry,
      profileImage,
      licenseDocument,
      isApproved
    } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user) return sendResponse(res, 404, false, "User not found");

    // Update Users table
    user.name = name || user.name;
    user.email = email || user.email;
    user.mobile = mobile || user.mobile;
    user.role = role || user.role;
    user.profileImage = profileImage || user.profileImage;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    // Update tradesman table IF user is tradesman
    let tradesman = await TradesmanDetails.findOne({ where: { userId: user.id } });

    if (tradesman) {
      tradesman.tradeType = tradeType || tradesman.tradeType;
      tradesman.businessName = businessName || tradesman.businessName;
      tradesman.shortBio = shortBio || tradesman.shortBio;
      tradesman.licenseNumber = licenseNumber || tradesman.licenseNumber;
      tradesman.licenseExpiry = licenseExpiry || tradesman.licenseExpiry;
      tradesman.licenseDocument = licenseDocument || tradesman.licenseDocument;
      tradesman.isApproved = isApproved ?? tradesman.isApproved;

      await tradesman.save();
    }

    return sendResponse(res, 200, true, "User updated successfully", user);

  } catch (error) {
    console.error("Update Error:", error);
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

exports.getAllTradesmen = async (req, res) => {
  try {
    const tradesmen = await User.findAll({
      where: { role: "tradesman" },
      include: [{ model: TradesmanDetails }],
    });

    if (tradesmen.length === 0)
      return sendResponse(res, 404, false, "No tradesmen found");

    return sendResponse(res, 200, true, "Tradesmen fetched", tradesmen);

  } catch (error) {
    console.error("Fetch Tradesmen Error:", error);
    return sendResponse(res, 500, false, "Server error");
  }
};

exports.getAllClients = async (req, res) => {
  try {
    const clients = await User.findAll({ where: { role: "client" } });

    if (clients.length === 0)
      return sendResponse(res, 404, false, "No clients found");

    return sendResponse(res, 200, true, "Clients fetched", clients);

  } catch (error) {
    console.error("Fetch Clients Error:", error);
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
