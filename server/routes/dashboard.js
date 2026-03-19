const express = require('express');
const router = express.Router();
const { getOne, getAll, runQuery } = require('../database');
const { requireLogin } = require('../middleware/auth');

// GET /api/dashboard
router.get('/', requireLogin, (req, res) => {
    try {
        const balance = getOne('SELECT * FROM society_balance WHERE id = 1');
        const activeLoansCount = getOne("SELECT COUNT(*) as count FROM loans WHERE status = 'active'").count;
        const completedLoansCount = getOne("SELECT COUNT(*) as count FROM loans WHERE status = 'completed'").count;
        const totalAccounts = getOne('SELECT COUNT(*) as count FROM accounts').count;
        const totalMembers = getOne('SELECT COUNT(*) as count FROM members').count;

        res.json({
            total_balance: balance.total_balance,
            total_pending_loans: balance.total_pending_loans,
            active_loans: activeLoansCount,
            completed_loans: completedLoansCount,
            total_accounts: totalAccounts,
            total_members: totalMembers
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/dashboard/balance
router.put('/balance', (req, res) => {
    try {
        if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { total_balance } = req.body;
        if (total_balance === undefined) {
            return res.status(400).json({ error: 'Balance amount is required' });
        }

        runQuery('UPDATE society_balance SET total_balance = ? WHERE id = 1', [total_balance]);
        const balance = getOne('SELECT * FROM society_balance WHERE id = 1');
        res.json(balance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
