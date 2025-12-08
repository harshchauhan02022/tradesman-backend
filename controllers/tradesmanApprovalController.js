// controllers/tradesmanApprovalController.js
const TradesmanDetails = require('../models/TradesmanDetails');
const User = require('../models/User');
const transporter = require('../config/email'); // you already have this
const { Op } = require('sequelize');

const sendResponse = (res, statusCode, success, message, data = null) =>
    res.status(statusCode).json({ success, message, data });

const tradesmanApprovalController = {
    // List pending tradesmen requests
    getPending: async (req, res) => {
        try {
            const pending = await TradesmanDetails.findAll({
                where: { isApproved: false },
                include: [
                    {
                        model: User,
                        attributes: ['id', 'name', 'email', 'mobile', 'role'],
                    },
                ],
                order: [['createdAt', 'DESC']],
            });

            return sendResponse(res, 200, true, 'Pending tradesmen fetched', pending);
        } catch (err) {
            console.error('getPending error:', err);
            return sendResponse(res, 500, false, 'Server error');
        }
    },

    // Approve tradesman
    approve: async (req, res) => {
        try {
            const { userId } = req.params;
            const reason = req.body.note || null;

            const details = await TradesmanDetails.findOne({ where: { userId } });
            if (!details) return sendResponse(res, 404, false, 'Tradesman details not found');

            details.isApproved = true;

            // optional: if you added columns approvedBy / approvedAt
            if (details.setDataValue) {
                // nothing — this is placeholder if you extend model
            }
            await details.save();

            // optional: you may want to update User table if you keep approval flag there
            // await User.update({ /* any field */ }, { where: { id: userId } });

            // fetch user to notify
            const user = await User.findByPk(userId);

            // send email notification (if transporter configured)
            if (transporter && user && user.email) {
                try {
                    const mailOptions = {
                        from: process.env.EMAIL_FROM || 'no-reply@example.com',
                        to: user.email,
                        subject: 'Your account has been approved',
                        html: `<p>Hi ${user.name || ''},</p>
                   <p>Your tradesman account has been <strong>approved</strong> by admin. You can now go live.</p>
                   ${reason ? `<p>Note from admin: ${reason}</p>` : ''}
                   <p>Thanks,<br/>Team</p>`
                    };
                    await transporter.sendMail(mailOptions);
                } catch (emailErr) {
                    console.error('Approval email error:', emailErr);
                    // don't fail the whole request if email fails
                }
            }

            return sendResponse(res, 200, true, 'Tradesman approved successfully', { user, details });
        } catch (err) {
            console.error('approve error:', err);
            return sendResponse(res, 500, false, 'Server error');
        }
    },

    // Reject tradesman
    reject: async (req, res) => {
        try {
            const { userId } = req.params;
            const { reason } = req.body;

            const details = await TradesmanDetails.findOne({ where: { userId } });
            if (!details) return sendResponse(res, 404, false, 'Tradesman details not found');

            // keep isApproved false (explicit)
            details.isApproved = false;

            // optional: store rejection reason if you added such column
            if ('rejectionReason' in details) {
                details.rejectionReason = reason || null;
            }

            await details.save();

            const user = await User.findByPk(userId);

            // send rejection email
            if (transporter && user && user.email) {
                try {
                    const mailOptions = {
                        from: process.env.EMAIL_FROM || 'no-reply@example.com',
                        to: user.email,
                        subject: 'Your tradesman request was rejected',
                        html: `<p>Hi ${user.name || ''},</p>
                   <p>Your tradesman account request has been <strong>rejected</strong> by admin.</p>
                   ${reason ? `<p>Reason: ${reason}</p>` : '<p>Please update your documents and reapply.</p>'}
                   <p>Thanks,<br/>Team</p>`
                    };
                    await transporter.sendMail(mailOptions);
                } catch (emailErr) {
                    console.error('Rejection email error:', emailErr);
                }
            }

            return sendResponse(res, 200, true, 'Tradesman rejected', { user, details });
        } catch (err) {
            console.error('reject error:', err);
            return sendResponse(res, 500, false, 'Server error');
        }
    },

    // OPTIONAL: endpoint to get single tradesman details (with user)
    getOne: async (req, res) => {
        try {
            const { userId } = req.params;

            const details = await TradesmanDetails.findOne({
                where: { userId },
                include: [{ model: User, attributes: ['id', 'name', 'email', 'mobile'] }],
            });

            if (!details) return sendResponse(res, 404, false, 'Not found');
            return sendResponse(res, 200, true, 'Fetched', details);
        } catch (err) {
            console.error('getOne error:', err);
            return sendResponse(res, 500, false, 'Server error');
        }
    }
};

module.exports = tradesmanApprovalController;
