const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');
require('dotenv').config();

exports.verifyAdminToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
    if (!token) return res.status(401).json({ success:false, message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) return res.status(401).json({ success:false, message: 'Invalid token' });

    // optional: ensure token has role admin
    if (decoded.role && decoded.role !== 'admin') {
      return res.status(403).json({ success:false, message: 'Admin role required' });
    }

    // Make sure admin still exists (optional but recommended)
    const admin = await Admin.findByPk(decoded.id);
    if (!admin) return res.status(401).json({ success:false, message: 'Unauthorized' });

    req.admin = admin;
    next();
  } catch (err) {
    console.error('verifyAdminToken error:', err);
    return res.status(401).json({ success:false, message: 'Unauthorized' });
  }
};
