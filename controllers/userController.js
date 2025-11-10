const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const crypto = require('crypto');
const transporter = require('../config/email');
require('dotenv').config({ path: './config/config.env' });

const sendResponse = (res, statusCode, success, message, data = null, error = null) => {
  res.status(statusCode).json({ success, message, data, error });
};

// Generate Token
const signToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register User
exports.register = async (req, res) => {
  try {
    const { name, email, mobile, password, role, tradeType, businessName, shortBio, licenseNumber, licenseExpiry, profileImage, licenseDocument } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      mobile,
      password: hashed,
      role,
      tradeType,
      businessName,
      shortBio,
      licenseNumber,
      licenseExpiry,
      profileImage,
      licenseDocument
    });

    res.status(201).json({ success: true, message: 'User registered successfully', user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid email or password' });

    const token = signToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get All Users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get User by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Fetch user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update User
exports.updateUser = async (req, res) => {
  try {
    const { name, email, mobile, password, role, tradeType, businessName, shortBio, licenseNumber, licenseExpiry, profileImage, licenseDocument, isApproved } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (password) user.password = await bcrypt.hash(password, 10);

    Object.assign(user, {
      name: name || user.name,
      email: email || user.email,
      mobile: mobile || user.mobile,
      role: role || user.role,
      tradeType: tradeType || user.tradeType,
      businessName: businessName || user.businessName,
      shortBio: shortBio || user.shortBio,
      licenseNumber: licenseNumber || user.licenseNumber,
      licenseExpiry: licenseExpiry || user.licenseExpiry,
      profileImage: profileImage || user.profileImage,
      licenseDocument: licenseDocument || user.licenseDocument,
      isApproved: isApproved ?? user.isApproved,
    });

    await user.save();
    res.status(200).json({ success: true, message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete User
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await user.destroy();
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return sendResponse(res, 400, false, 'Email is required');

    const user = await User.findOne({ where: { email } });
    if (!user) return sendResponse(res, 404, false, 'User not found');

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await user.update({
      resetPasswordToken: token,
      resetPasswordExpires: expiry,
    });

    const resetLink = `${process.env.BACKEND_URL}/reset-password/${token}`;

    // Send email
    await transporter.sendMail({
      from: `"Tradesman Travel App" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <p>Hello ${user.name || ''},</p>
        <p>You requested to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
        <p>This link will expire in 15 minutes.</p>
      `,
    });

    sendResponse(res, 200, true, 'Password reset link sent to your email');
  } catch (err) {
    console.error('forgotPassword error:', err);
    sendResponse(res, 500, false, 'Server error', null, err.message);
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword)
      return sendResponse(res, 400, false, 'New password is required');

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() }, // token not expired
      },
    });

    if (!user)
      return sendResponse(res, 400, false, 'Invalid or expired token');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.update({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    sendResponse(res, 200, true, 'Password reset successfully');
  } catch (err) {
    console.error('resetPassword error:', err);
    sendResponse(res, 500, false, 'Server error', null, err.message);
  }
};
