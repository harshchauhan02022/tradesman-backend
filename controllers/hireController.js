// controllers/hireController.js
const Hire = require('../models/hireModel');
const Review = require('../models/reviewModel');
const User = require('../models/User');
const { Op, fn, col } = require('sequelize');

const sendResponse = (res, status, success, message, data = null) =>
  res.status(status).json({ success, message, data });

/**
 * POST /api/hire/request
 * body: { tradesmanId, jobDescription? }
 * Client -> send hire request
 */
exports.requestHire = async (req, res) => {
  try {
    const clientId = req.user?.id;
    const role = req.user?.role;
    const { tradesmanId, jobDescription } = req.body;

    if (!clientId) return sendResponse(res, 401, false, 'Unauthorized');
    if (role !== 'client')
      return sendResponse(res, 403, false, 'Only clients can send hire request');
    if (!tradesmanId)
      return sendResponse(res, 400, false, 'tradesmanId is required');

    const existingPending = await Hire.findOne({
      where: { clientId, tradesmanId, status: 'pending' }
    });

    if (existingPending) {
      return sendResponse(
        res,
        400,
        false,
        'You already have a pending hire request with this tradesman'
      );
    }

    const hire = await Hire.create({
      clientId,
      tradesmanId,
      jobDescription: jobDescription || null,
      status: 'pending'
    });

    return sendResponse(res, 201, true, 'Hire request sent', hire);
  } catch (err) {
    console.error('requestHire error:', err);
    return sendResponse(res, 500, false, 'Server error');
  }
};

/**
 * POST /api/hire/respond
 * body: { hireId, action: "accept" | "reject" }
 * Tradesman -> accept / reject
 */
exports.respondHire = async (req, res) => {
  try {
    const tradesmanId = req.user?.id;
    const role = req.user?.role;
    const { hireId, action } = req.body;

    if (!tradesmanId) return sendResponse(res, 401, false, 'Unauthorized');
    if (role !== 'tradesman')
      return sendResponse(res, 403, false, 'Only tradesman can respond to hire');
    if (!hireId || !['accept', 'reject'].includes(action))
      return sendResponse(res, 400, false, 'hireId and valid action required');

    const hire = await Hire.findOne({ where: { id: hireId, tradesmanId } });
    if (!hire) return sendResponse(res, 404, false, 'Hire not found');
    if (hire.status !== 'pending')
      return sendResponse(res, 400, false, 'Hire is not pending');

    hire.status = action === 'accept' ? 'accepted' : 'rejected';
    await hire.save();

    return sendResponse(res, 200, true, `Hire ${hire.status}`, hire);
  } catch (err) {
    console.error('respondHire error:', err);
    return sendResponse(res, 500, false, 'Server error');
  }
};

/**
 * POST /api/hire/complete
 * body: { hireId }
 * Client -> mark job completed
 */
exports.completeHire = async (req, res) => {
  try {
    const clientId = req.user?.id;
    const role = req.user?.role;
    const { hireId } = req.body;

    if (!clientId) return sendResponse(res, 401, false, 'Unauthorized');
    if (role !== 'client')
      return sendResponse(res, 403, false, 'Only client can complete hire');
    if (!hireId)
      return sendResponse(res, 400, false, 'hireId required');

    const hire = await Hire.findOne({ where: { id: hireId, clientId } });
    if (!hire) return sendResponse(res, 404, false, 'Hire not found');
    if (hire.status !== 'accepted')
      return sendResponse(res, 400, false, 'Only accepted hire can be completed');

    hire.status = 'completed';
    await hire.save();

    return sendResponse(res, 200, true, 'Hire marked as completed', hire);
  } catch (err) {
    console.error('completeHire error:', err);
    return sendResponse(res, 500, false, 'Server error');
  }
};

/**
 * GET /api/hire/status/:userId
 * For chat screen -> latest hire between me & other user
 */
exports.getHireStatusForConversation = async (req, res) => {
  try {
    const me = req.user?.id;
    const otherId = parseInt(req.params.userId, 10);

    if (!me) return sendResponse(res, 401, false, 'Unauthorized');
    if (!otherId || Number.isNaN(otherId))
      return sendResponse(res, 400, false, 'userId required');

    const hire = await Hire.findOne({
      where: {
        [Op.or]: [
          { clientId: me, tradesmanId: otherId },
          { clientId: otherId, tradesmanId: me }
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    return sendResponse(res, 200, true, 'Hire status fetched', hire);
  } catch (err) {
    console.error('getHireStatusForConversation error:', err);
    return sendResponse(res, 500, false, 'Server error');
  }
};

/* ============================================================
   NEW: JOB LIST (Booking tab)
   GET /api/hire/my?filter=all|active|completed
============================================================ */
exports.getMyJobs = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const filter = (req.query.filter || 'all').toLowerCase();

    if (!userId) return sendResponse(res, 401, false, 'Unauthorized');

    const where = {};

    if (role === 'client') {
      where.clientId = userId;
    } else if (role === 'tradesman') {
      where.tradesmanId = userId;
    }

    if (filter === 'active') {
      // pending + accepted
      where.status = { [Op.in]: ['pending', 'accepted'] };
    } else if (filter === 'completed') {
      where.status = 'completed';
    }

    const jobs = await Hire.findAll({
      where,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'name', 'profileImage']
        },
        {
          model: User,
          as: 'tradesman',
          attributes: ['id', 'name', 'profileImage']
        },
        {
          model: Review,
          as: 'review',
          required: false,
          attributes: ['id', 'rating', 'comment', 'jobDate', 'createdAt']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const mapped = jobs.map((job) => {
      const otherUser =
        role === 'client' ? job.tradesman : role === 'tradesman' ? job.client : null;

      let statusLabel = 'Active';
      let subtitle = 'Quote sent';

      if (job.status === 'completed') {
        statusLabel = 'Completed';
        subtitle = 'Job Completed';
      } else if (job.status === 'rejected') {
        statusLabel = 'Rejected';
        subtitle = 'Request Rejected';
      } else if (job.status === 'pending') {
        statusLabel = 'Pending';
        subtitle = 'Quote sent';
      } else if (job.status === 'accepted') {
        statusLabel = 'Active';
        subtitle = 'Job Accepted';
      } else if (job.status === 'cancelled') {
        statusLabel = 'Cancelled';
        subtitle = 'Cancelled';
      }

      return {
        id: job.id,
        status: job.status,
        statusLabel,
        subtitle,
        createdAt: job.createdAt,
        client: job.client,
        tradesman: job.tradesman,
        otherUser,
        review: job.review
      };
    });

    return sendResponse(res, 200, true, 'Jobs fetched', mapped);
  } catch (err) {
    console.error('getMyJobs error:', err);
    return sendResponse(res, 500, false, 'Server error');
  }
};

/* ============================================================
   NEW: CREATE REVIEW (Rate Your Experience popup)
   POST /api/hire/review
   body: { hireId, rating, comment }
============================================================ */
exports.createReviewForJob = async (req, res) => {
  try {
    const clientId = req.user?.id;
    const role = req.user?.role;
    const { hireId, rating, comment } = req.body;

    if (!clientId) return sendResponse(res, 401, false, 'Unauthorized');
    if (role !== 'client')
      return sendResponse(res, 403, false, 'Only clients can review jobs');

    if (!hireId || !rating)
      return sendResponse(res, 400, false, 'hireId and rating are required');

    const hire = await Hire.findByPk(hireId);
    if (!hire) return sendResponse(res, 404, false, 'Job not found');

    if (hire.clientId !== clientId)
      return sendResponse(res, 403, false, 'You are not the client for this job');

    if (hire.status !== 'completed')
      return sendResponse(res, 400, false, 'You can review only completed jobs');

    const existing = await Review.findOne({ where: { hireId } });
    if (existing)
      return sendResponse(res, 400, false, 'You already reviewed this job');

    const review = await Review.create({
      hireId,
      fromUserId: clientId,
      toUserId: hire.tradesmanId,
      rating,
      comment: comment || null,
      jobDate: new Date()
    });

    return sendResponse(res, 201, true, 'Review submitted', review);
  } catch (err) {
    console.error('createReviewForJob error:', err);
    return sendResponse(res, 500, false, 'Server error');
  }
};

/* ============================================================
   NEW: Tradesman profile - reviews + average rating
   GET /api/hire/reviews/:tradesmanId
============================================================ */
exports.getReviewsForTradesman = async (req, res) => {
  try {
    const tradesmanId = parseInt(req.params.tradesmanId, 10);

    const reviews = await Review.findAll({
      where: { toUserId: tradesmanId },
      include: [
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'profileImage']
        },
        {
          model: Hire,
          as: 'hire',
          attributes: ['id', 'jobDescription', 'createdAt']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const agg = await Review.findOne({
      where: { toUserId: tradesmanId },
      attributes: [
        [fn('AVG', col('rating')), 'avgRating'],
        [fn('COUNT', col('id')), 'reviewCount']
      ]
    });

    const avgRating = agg ? Number(agg.get('avgRating')) : 0;
    const reviewCount = agg ? Number(agg.get('reviewCount')) : 0;

    return sendResponse(res, 200, true, 'Reviews fetched', {
      avgRating,
      reviewCount,
      reviews
    });
  } catch (err) {
    console.error('getReviewsForTradesman error:', err);
    return sendResponse(res, 500, false, 'Server error');
  }
};
