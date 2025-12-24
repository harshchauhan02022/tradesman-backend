const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { upload, convertToJpg } = require('../middlewares/uploadMiddleware');

// Public Routes
router.post(
  '/register',
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'licenseDocument', maxCount: 1 },
    { name: 'portfolioPhotos', maxCount: 10 },
  ]),
  convertToJpg,
  userController.register
);

router.post('/login', userController.login);

// 🔹 Custom Get Routes (must be above /:id)
// These endpoints support pagination via query params: ?page=1&limit=10
router.get('/tradesmen', userController.getAllTradesmen);
router.get('/clients', userController.getAllClients);
router.get('/tradesmen/filter', userController.filterTradesmen);


router.get('/profile/:id', userController.getFullUserProfile);

// 🔹 Token based current user profile
router.get('/me', verifyToken, userController.getMeProfile);

// 🔹 Protected Route for Change Password
router.put('/change-password', verifyToken, userController.changePassword);

// 🔹 Other CRUD routes (getAllUsers supports pagination & search)
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put(
  "/profile",
  verifyToken,
  upload.single("profileImage"),
  convertToJpg,
  userController.updateProfile
);
router.delete('/:id', verifyToken, userController.deleteUser);

// 🔹 Password Reset
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password/:token', userController.resetPassword);

module.exports = router;
