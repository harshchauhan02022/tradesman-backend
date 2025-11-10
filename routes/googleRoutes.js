const express = require('express');
const passport = require('passport');
const { googleCallback } = require('../controllers/googleAuthController');
const router = express.Router();

// Step 1: Start Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Step 2: Callback route
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  googleCallback
);

module.exports = router;
