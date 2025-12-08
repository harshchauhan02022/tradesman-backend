const User = require('../models/User');

const approvalController = {

    // GET /api/admin/tradesmen/pending
    getPendingTradesmen: async (req, res) => {
        try {
            const pending = await User.findAll({
                where: {
                    role: 'tradesman',
                    approvalStatus: 'PENDING'
                },
                order: [['createdAt', 'DESC']]
            });

            return res.json({ success: true, data: pending });
        } catch (err) {
            console.error('getPendingTradesmen error:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    // POST /api/admin/tradesmen/:id/approve
    approveTradesman: async (req, res) => {
        try {
            const tradesmanId = req.params.id;
            const note = req.body.note || null;

            const user = await User.findOne({
                where: { id: tradesmanId, role: 'tradesman' }
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'Tradesman not found' });
            }

            await user.update({
                approvalStatus: 'APPROVED',
                approvalNote: note,
                approvedBy: req.admin.id,
                approvedAt: new Date()
            });

            return res.json({
                success: true,
                message: 'Tradesman approved successfully',
                data: user
            });
        } catch (err) {
            console.error('approveTradesman error:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    // POST /api/admin/tradesmen/:id/reject
    rejectTradesman: async (req, res) => {
        try {
            const tradesmanId = req.params.id;
            const note = req.body.note || null;

            const user = await User.findOne({
                where: { id: tradesmanId, role: 'tradesman' }
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'Tradesman not found' });
            }

            await user.update({
                approvalStatus: 'REJECTED',
                approvalNote: note,
                approvedBy: req.admin.id,
                approvedAt: new Date()
            });

            return res.json({
                success: true,
                message: 'Tradesman rejected',
                data: user
            });
        } catch (err) {
            console.error('rejectTradesman error:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    }

};

module.exports = approvalController;
