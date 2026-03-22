const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const Loan = require('../models/Loan');
const Installment = require('../models/Installment');
const Account = require('../models/Account');
const Member = require('../models/Member');
const MonthlyFee = require('../models/MonthlyFee');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

// GET /api/reports/loans
router.get('/loans', requireLogin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = {};
        
        if (startDate && endDate) {
            query.created_at = {
                $gte: new Date(startDate),
                $lte: new Date(endDate + 'T23:59:59.999Z')
            };
        }

        const loans = await Loan.find(query).sort({ created_at: -1 }).populate('account_id', 'account_no').lean();

        const result = await Promise.all(loans.map(async (loan) => {
            if (!loan.account_id) {
                return { ...loan, id: loan._id, account_no: 'Deleted', member_name: 'Unknown' };
            }
            let memberName = 'Unknown';
            if (loan.member_id) {
                const member = await Member.findById(loan.member_id).lean();
                if (member) memberName = member.name;
            } else {
                const member = await Member.findOne({ account_id: loan.account_id._id }).sort('position').lean();
                if (member) memberName = member.name;
            }
            return {
                ...loan,
                id: loan._id,
                account_no: loan.account_id.account_no,
                member_name: memberName
            };
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/pending-fees
router.get('/pending-fees', requireLogin, async (req, res) => {
    try {
        const { startMonth, startYear, endMonth, endYear } = req.query;

        // Build all (month, year) combos in the requested range
        const now = new Date();
        const sMonth = startMonth ? Number(startMonth) : 8;
        const sYear = startYear ? Number(startYear) : 2018;
        const eMonth = endMonth ? Number(endMonth) : now.getMonth() + 1;
        const eYear = endYear ? Number(endYear) : now.getFullYear();

        const monthYearPairs = [];
        for (let y = sYear; y <= eYear; y++) {
            const mStart = (y === sYear) ? sMonth : 1;
            const mEnd = (y === eYear) ? eMonth : 12;
            for (let m = mStart; m <= mEnd; m++) {
                monthYearPairs.push({ month: m, year: y });
            }
        }

        // Get all members
        const members = await Member.find().populate('account_id', 'account_no').lean();

        // Get all MonthlyFee records that are paid in this range
        const orConditions = monthYearPairs.map(p => ({ month: p.month, year: p.year, is_paid: true }));
        const paidFees = orConditions.length > 0
            ? await MonthlyFee.find({ $or: orConditions }).lean()
            : [];

        // Build a Set of "memberId-month-year" for quick lookup
        const paidSet = new Set(paidFees.map(f => `${f.member_id}-${f.month}-${f.year}`));

        const result = [];
        for (const member of members) {
            const unpaidMonths = [];
            for (const p of monthYearPairs) {
                const key = `${member._id}-${p.month}-${p.year}`;
                if (!paidSet.has(key)) {
                    unpaidMonths.push(`${p.month}/${p.year}`);
                }
            }
            if (unpaidMonths.length > 0) {
                result.push({
                    member_name: member.name,
                    account_no: member.account_id ? member.account_id.account_no : 'Unknown',
                    pending_months_count: unpaidMonths.length,
                    total_pending_amount: unpaidMonths.length * 500,
                    details: unpaidMonths
                });
            }
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/pending-installments
router.get('/pending-installments', requireLogin, async (req, res) => {
    try {
        const { monthLabel } = req.query; // e.g. "March 2026"
        let query = { is_paid: false };
        
        // If no monthLabel provided, get ALL pending installments
        if (monthLabel && monthLabel.trim() !== '') {
            query.month_label = monthLabel.trim();
        }

        const installments = await Installment.find(query).lean();
        
        if (installments.length === 0) {
            return res.json([]);
        }
        
        const loanIds = [...new Set(installments.map(i => i.loan_id.toString()))];
        
        const loans = await Loan.find({ _id: { $in: loanIds }, status: 'active' }).populate('account_id', 'account_no').lean();

        const result = await Promise.all(loans.map(async loan => {
            if (!loan.account_id) return null;
            
            let memberName = 'Unknown';
            if (loan.member_id) {
                const member = await Member.findById(loan.member_id).lean();
                if (member) memberName = member.name;
            } else {
                const member = await Member.findOne({ account_id: loan.account_id._id }).sort('position').lean();
                if (member) memberName = member.name;
            }
            
            const pendingInsts = installments.filter(i => i.loan_id.toString() === loan._id.toString());
            
            return {
                member_name: memberName,
                account_no: loan.account_id ? loan.account_id.account_no : 'Unknown',
                loan_principal: loan.principal,
                pending_installments: pendingInsts.map(i => ({
                     installment_no: i.installment_no,
                     month_label: i.month_label,
                     amount_due: i.default_amount
                }))
            };
        }));

        res.json(result.filter(Boolean));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
