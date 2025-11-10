const express = require('express');
const router = express.Router();
const adminAuth = require('../controllers/adminAuthController');

// Admin registration (optional)
router.post('/register', adminAuth.registerAdmin);

// Admin login
router.post('/login', adminAuth.loginAdmin);

module.exports = router;
