const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const Loan = require('../models/Loan');
const Installment = require('../models/Installment');
const Account = require('../models/Account');
const Member = require('../models/Member');
const MonthlyFee = require('../models/MonthlyFee');

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
                return { ...loan, account_no: 'Deleted', member_name: 'Unknown' };
            }
            const member = await Member.findOne({ account_id: loan.account_id._id }).sort('position').lean();
            return {
                ...loan,
                account_no: loan.account_id.account_no,
                member_name: member ? member.name : 'Unknown'
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
        let query = { is_paid: false };
        
        if (startMonth && startYear && endMonth && endYear) {
            if (startYear === endYear) {
               query.$and = [
                   { year: Number(startYear) },
                   { month: { $gte: Number(startMonth), $lte: Number(endMonth) } }
               ];
            } else {
                query.$or = [
                    { year: { $gt: Number(startYear), $lt: Number(endYear) } },
                    { year: Number(startYear), month: { $gte: Number(startMonth) } },
                    { year: Number(endYear), month: { $lte: Number(endMonth) } }
                ];
            }
        }

        const fees = await MonthlyFee.find(query).lean();
        
        const memberIds = [...new Set(fees.map(f => f.member_id.toString()))];
        const members = await Member.find({ _id: { $in: memberIds } }).populate('account_id', 'account_no').lean();
        
        const result = members.map(m => {
            const memberFees = fees.filter(f => f.member_id.toString() === m._id.toString());
            const totalPending = memberFees.reduce((sum, f) => sum + f.amount, 0);
            return {
                member_name: m.name,
                account_no: m.account_id ? m.account_id.account_no : 'Unknown',
                pending_months_count: memberFees.length,
                total_pending_amount: totalPending,
                details: memberFees.map(f => `${f.month}/${f.year}`)
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/pending-installments
router.get('/pending-installments', requireLogin, async (req, res) => {
    try {
        const { monthLabel } = req.query; // e.g. "August 2024"
        let query = { is_paid: false };
        if (monthLabel) {
            // Need exactly match string like "August 2035"
            if (monthLabel.trim() !== "") {
                query.month_label = monthLabel.trim();
            }
        }

        const installments = await Installment.find(query).lean();
        const loanIds = [...new Set(installments.map(i => i.loan_id.toString()))];
        
        const loans = await Loan.find({ _id: { $in: loanIds } }).populate('account_id', 'account_no').lean();

        const result = await Promise.all(loans.map(async loan => {
            const member = await Member.findOne({ account_id: loan.account_id._id }).sort('position').lean();
            const pendingInsts = installments.filter(i => i.loan_id.toString() === loan._id.toString());
            
            return {
                member_name: member ? member.name : 'Unknown',
                account_no: loan.account_id ? loan.account_id.account_no : 'Unknown',
                loan_principal: loan.principal,
                pending_installments: pendingInsts.map(i => ({
                     installment_no: i.installment_no,
                     month_label: i.month_label,
                     amount_due: i.default_amount
                }))
            };
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
