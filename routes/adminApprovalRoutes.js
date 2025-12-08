// routes/adminApprovalRoutes.js
const express = require('express');
const router = express.Router();

const { verifyAdminToken } = require('../middlewares/adminAuthMiddleware');
const tradesmanApprovalController = require('../controllers/tradesmanApprovalController');

// list pending
router.get('/tradesmen/pending', verifyAdminToken, tradesmanApprovalController.getPending);

// approve
router.post('/tradesmen/:userId/approve', verifyAdminToken, tradesmanApprovalController.approve);

// reject
router.post('/tradesmen/:userId/reject', verifyAdminToken, tradesmanApprovalController.reject);

// optional: fetch single
router.get('/tradesmen/:userId', verifyAdminToken, tradesmanApprovalController.getOne);

module.exports = router;
