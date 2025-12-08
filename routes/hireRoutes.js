// routes/hireRoutes.js
const express = require('express');
const router = express.Router();
const hireController = require('../controllers/hireController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Client → create hire request
router.post('/request', verifyToken, hireController.requestHire);

// Tradesman → accept / reject
router.post('/respond', verifyToken, hireController.respondHire);

// Client → mark job as completed
router.post('/complete', verifyToken, hireController.completeHire);

// Chat screen → latest hire status between me & other user
router.get('/status/:userId', verifyToken, hireController.getHireStatusForConversation);

// Booking tab → my jobs list (client or tradesman)
router.get('/my', verifyToken, hireController.getMyJobs);

// Rate Your Experience → create review
router.post('/review', verifyToken, hireController.createReviewForJob);

// Tradesman profile → reviews + avg rating
router.get('/reviews/:tradesmanId', hireController.getReviewsForTradesman);

module.exports = router;
