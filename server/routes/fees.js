const express = require('express');
const router = express.Router();
const { requireLogin, requireAdmin } = require('../middleware/auth');
const Member = require('../models/Member');
const MonthlyFee = require('../models/MonthlyFee');
const SocietyBalance = require('../models/SocietyBalance');

const START_YEAR = 2018;
const START_MONTH = 8; // August

function getMonthsSinceStart() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    let months = 0;
    for (let y = START_YEAR; y <= currentYear; y++) {
        const startM = (y === START_YEAR) ? START_MONTH : 1;
        const endM = (y === currentYear) ? currentMonth : 12;
        for (let m = startM; m <= endM; m++) {
            months++;
        }
    }
    return months;
}

// GET /api/fees/calculator — Get onboarding / exit cost structure
router.get('/calculator', requireLogin, async (req, res) => {
    try {
        const memberCount = await Member.countDocuments() || 1; // prevent div by zero
        const balance = await SocietyBalance.findOne();
        const totalInterest = balance ? balance.total_lifetime_interest_earned : 0;
        
        const monthsCount = getMonthsSinceStart();
        const baseDues = monthsCount * 500;
        const interestShare = Math.floor(totalInterest / memberCount);
        const totalAmount = baseDues + interestShare;

        res.json({
            months_since_aug_2018: monthsCount,
            base_dues: baseDues,
            total_society_interest_earned: totalInterest,
            current_member_count: await Member.countDocuments(),
            interest_share_per_member: interestShare,
            total_onboarding_or_exit_cost: totalAmount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fees/member/:memberId — Get all months since 2018 and their paid status
router.get('/member/:memberId', requireLogin, async (req, res) => {
    try {
        const member = await Member.findById(req.params.memberId);
        if (!member) return res.status(404).json({ error: 'Member not found' });

        const fees = await MonthlyFee.find({ member_id: member._id }).lean();
        const paidSet = new Set(fees.filter(f => f.is_paid).map(f => `${f.year}-${f.month}`));

        const history = [];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        for (let y = START_YEAR; y <= currentYear; y++) {
            const startM = (y === START_YEAR) ? START_MONTH : 1;
            const endM = (y === currentYear) ? currentMonth : 12;
            for (let m = startM; m <= endM; m++) {
                const isPaid = paidSet.has(`${y}-${m}`);
                const feeRecord = fees.find(f => f.year === y && f.month === m);
                history.push({
                    month: m,
                    year: y,
                    is_paid: isPaid,
                    paid_date: feeRecord ? feeRecord.paid_date : null
                });
            }
        }

        res.json({ member_id: member._id, name: member.name, history: history.reverse() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/fees/pay — Mark a specific month as paid
router.post('/pay', requireAdmin, async (req, res) => {
    try {
        const { member_id, month, year } = req.body;
        if (!member_id || !month || !year) return res.status(400).json({ error: 'Missing required fields' });

        const member = await Member.findById(member_id);
        if (!member) return res.status(404).json({ error: 'Member not found' });

        let fee = await MonthlyFee.findOne({ member_id, month, year });
        if (fee && fee.is_paid) return res.status(400).json({ error: 'This month is already paid' });

        if (!fee) {
            fee = new MonthlyFee({
                member_id: member._id,
                account_id: member.account_id,
                month: Number(month),
                year: Number(year),
                is_paid: true,
                paid_date: new Date(),
                amount: 500
            });
        } else {
            fee.is_paid = true;
            fee.paid_date = new Date();
        }
        await fee.save();

        member.total_principal_paid += 500;
        await member.save();

        const balance = await SocietyBalance.findOne();
        if (balance) {
            balance.total_balance += 500;
            await balance.save();
        }

        res.json({ message: `Successfully marked ${month}/${year} as paid for ${member.name}.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/fees/unpay — Mark a specific month as unpaid
router.post('/unpay', requireAdmin, async (req, res) => {
    try {
        const { member_id, month, year } = req.body;
        if (!member_id || !month || !year) return res.status(400).json({ error: 'Missing required fields' });

        const member = await Member.findById(member_id);
        if (!member) return res.status(404).json({ error: 'Member not found' });

        let fee = await MonthlyFee.findOne({ member_id, month, year });
        if (!fee || !fee.is_paid) return res.status(400).json({ error: 'This month is not paid yet' });

        fee.is_paid = false;
        fee.paid_date = null;
        await fee.save();

        member.total_principal_paid -= 500;
        await member.save();

        const balance = await SocietyBalance.findOne();
        if (balance) {
            balance.total_balance -= 500;
            await balance.save();
        }

        res.json({ message: `Successfully reversed ${month}/${year} as unpaid for ${member.name}.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
