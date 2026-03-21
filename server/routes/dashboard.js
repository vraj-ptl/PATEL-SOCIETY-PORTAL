const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const SocietyBalance = require('../models/SocietyBalance');
const Loan = require('../models/Loan');
const Account = require('../models/Account');
const Member = require('../models/Member');

// GET /api/dashboard
router.get('/', requireLogin, async (req, res) => {
    try {
        const balance = await SocietyBalance.findOne();
        const activeLoansCount = await Loan.countDocuments({ status: 'active' });
        const completedLoansCount = await Loan.countDocuments({ status: 'completed' });
        const totalAccounts = await Account.countDocuments();
        const totalMembers = await Member.countDocuments();

        res.json({
            total_balance: balance ? balance.total_balance : 0,
            total_pending_loans: balance ? balance.total_pending_loans : 0,
            total_lifetime_interest_earned: balance ? balance.total_lifetime_interest_earned : 0,
            active_loans: activeLoansCount,
            completed_loans: completedLoansCount,
            total_accounts: totalAccounts,
            total_members: totalMembers
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/dashboard/add-balance
router.post('/add-balance', async (req, res) => {
    try {
        if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' });

        let balance = await SocietyBalance.findOne();
        if (balance) {
            balance.total_balance += Number(amount);
            await balance.save();
        }
        res.json(balance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/dashboard/remove-balance
router.post('/remove-balance', async (req, res) => {
    try {
        if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' });

        let balance = await SocietyBalance.findOne();
        if (balance) {
            balance.total_balance -= Number(amount);
            await balance.save();
        }
        res.json(balance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/dashboard/set-balance
router.post('/set-balance', async (req, res) => {
    try {
        if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { amount } = req.body;
        if (amount === undefined || amount === null || isNaN(Number(amount))) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        let balance = await SocietyBalance.findOne();
        if (!balance) {
            // Should exist due to DB init, but just in case
            balance = new SocietyBalance({ total_balance: Number(amount) });
        } else {
            balance.total_balance = Number(amount);
        }
        await balance.save();
        
        res.json(balance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/dashboard/distribute-bonus
router.post('/distribute-bonus', async (req, res) => {
    try {
        if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { bonusPerMember } = req.body;
        if (!bonusPerMember || bonusPerMember <= 0) return res.status(400).json({ error: 'Valid bonus required' });

        const numMembers = await Member.countDocuments();
        const totalCost = numMembers * Number(bonusPerMember);

        let balance = await SocietyBalance.findOne();
        if (!balance || balance.total_balance < totalCost) {
            return res.status(400).json({ error: 'Insufficient Society Balance to distribute bonus to all members' });
        }

        balance.total_balance -= totalCost;
        await balance.save();

        // Bonus is now per-MEMBER wallet, not account!
        await Member.updateMany({}, { $inc: { wallet_balance: Number(bonusPerMember) } });

        res.json({ message: `Distributed ₹${bonusPerMember} to ${numMembers} members successfully.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/dashboard/set-lifetime-interest — manually set total lifetime interest earned
router.post('/set-lifetime-interest', async (req, res) => {
    try {
        if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { amount } = req.body;
        if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) < 0) {
            return res.status(400).json({ error: 'Valid amount is required (must be >= 0)' });
        }

        let balance = await SocietyBalance.findOne();
        if (balance) {
            balance.total_lifetime_interest_earned = Number(amount);
            await balance.save();
        }
        res.json(balance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
