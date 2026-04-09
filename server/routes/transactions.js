const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const Transaction = require('../models/Transaction');

// GET /api/transactions
router.get('/', requireLogin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = {};

        if (startDate && endDate) {
            // Need to set endDate to 23:59:59 to include the whole entire day
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            query.date = {
                $gte: new Date(startDate),
                $lte: end
            };
        }

        const transactions = await Transaction.find(query).sort({ date: -1, recorded_at: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
