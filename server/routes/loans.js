const express = require('express');
const router = express.Router();
const { requireLogin, requireAdmin } = require('../middleware/auth');
const Loan = require('../models/Loan');
const Installment = require('../models/Installment');
const Account = require('../models/Account');
const Member = require('../models/Member');
const SocietyBalance = require('../models/SocietyBalance');

const LOAN_PLANS = {
    '50000_1': {
        principal: 50000, years: 1, interest: 1500, totalAmount: 51500,
        installments: [
            { amount: 1500 },
            ...Array(10).fill({ amount: 4000 }),
            { amount: 5000 },
            { amount: 5000 }
        ]
    },
    '50000_2': {
        principal: 50000, years: 2, interest: 3000, totalAmount: 53000,
        installments: [
            { amount: 3000 },
            ...Array(22).fill({ amount: 2000 }),
            { amount: 3000 },
            { amount: 3000 }
        ]
    },
    '100000_1': {
        principal: 100000, years: 1, interest: 3000, totalAmount: 103000,
        installments: [
            { amount: 3000 },
            ...Array(12).fill({ amount: 8000 }),
            { amount: 4000 }
        ]
    },
    '100000_2': {
        principal: 100000, years: 2, interest: 6000, totalAmount: 106000,
        installments: [
            { amount: 6000 },
            ...Array(25).fill({ amount: 4000 })
        ]
    }
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function getMonthLabel(startMonth, startYear, offset) {
    const monthIndex = (startMonth - 1 + offset) % 12;
    const yearOffset = Math.floor((startMonth - 1 + offset) / 12);
    return `${MONTH_NAMES[monthIndex]} ${startYear + yearOffset}`;
}

// GET /api/loans — list all loans
router.get('/', requireLogin, async (req, res) => {
    try {
        let loans;
        if (req.session.user.role === 'admin') {
            loans = await Loan.find().sort({ created_at: -1 }).populate('account_id', 'account_no').lean();
        } else {
            loans = await Loan.find({ account_id: req.session.user.account_id })
                .sort({ created_at: -1 }).populate('account_id', 'account_no').lean();
        }

        const result = await Promise.all(loans.map(async (loan) => {
            if (!loan.account_id) {
                return {
                    ...loan,
                    id: loan._id,
                    account_no: 'Deleted/Unknown',
                    member_name: 'Unknown Member'
                };
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
        console.error('Error fetching loans:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/loans/:id — get loan detail with installments
router.get('/:id', requireLogin, async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id).populate('account_id', 'account_no').lean();
        if (!loan) return res.status(404).json({ error: 'Loan not found' });

        if (req.session.user.role === 'member' && req.session.user.account_id !== loan.account_id._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const installments = await Installment.find({ loan_id: loan._id }).sort('installment_no').lean();
        const members = await Member.find({ account_id: loan.account_id._id }).sort('position').lean();

        let loanMemberName = 'Unknown';
        if (loan.member_id) {
            const m = await Member.findById(loan.member_id).lean();
            if (m) loanMemberName = m.name;
        }

        res.json({
            ...loan,
            id: loan._id,
            account_no: loan.account_id.account_no,
            member_name: loanMemberName,
            installments: installments.map(i => ({...i, id: i._id})),
            members: members.map(m => ({ id: m._id, name: m.name }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/loans/account-members/:accountNo — get members of an account for loan creation
router.get('/account-members/:accountNo', requireAdmin, async (req, res) => {
    try {
        const account = await Account.findOne({ account_no: req.params.accountNo });
        if (!account) return res.status(404).json({ error: 'Account not found' });

        const members = await Member.find({ account_id: account._id }).sort('position').lean();
        
        // For each member, check if they already have an active loan
        const result = await Promise.all(members.map(async m => {
            const activeLoan = await Loan.findOne({ member_id: m._id, status: 'active' });
            return {
                id: m._id,
                name: m.name,
                has_active_loan: !!activeLoan
            };
        }));
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/loans — create new loan
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { account_no, member_id, principal, time_period_years, start_month, start_year } = req.body;

        if (!account_no || !principal || !time_period_years || !start_month || !start_year) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const account = await Account.findOne({ account_no });
        if (!account) return res.status(404).json({ error: 'Account not found' });

        // Validate member_id if provided
        if (member_id) {
            const member = await Member.findById(member_id);
            if (!member) return res.status(404).json({ error: 'Member not found' });
            if (member.account_id.toString() !== account._id.toString()) {
                return res.status(400).json({ error: 'Member does not belong to this account' });
            }
            // Check if this member already has an active loan
            const activeLoan = await Loan.findOne({ member_id: member._id, status: 'active' });
            if (activeLoan) {
                return res.status(400).json({ error: `${member.name} already has an active loan. Complete it first.` });
            }
        }

        const planKey = `${principal}_${time_period_years}`;
        const plan = LOAN_PLANS[planKey];
        if (!plan) return res.status(400).json({ error: 'Invalid loan plan' });

        const loan = new Loan({
            account_id: account._id,
            member_id: member_id || undefined,
            principal: plan.principal,
            time_period_years: time_period_years,
            interest: plan.interest,
            total_amount: plan.totalAmount,
            total_installments: plan.installments.length,
            start_month: start_month,
            start_year: start_year,
            remaining_balance: plan.totalAmount,
            total_paid: 0
        });
        await loan.save();

        const installmentDocs = plan.installments.map((inst, index) => ({
            loan_id: loan._id,
            installment_no: index + 1,
            month_label: getMonthLabel(start_month, start_year, index),
            default_amount: inst.amount,
            paid_amount: 0,
            is_paid: false
        }));
        await Installment.insertMany(installmentDocs);

        // Update society balance
        const balance = await SocietyBalance.findOne();
        if (balance) {
            balance.total_balance -= plan.principal;
            balance.total_pending_loans += plan.totalAmount;
            await balance.save();
        }

        const populatedLoan = await Loan.findById(loan._id).populate('account_id', 'account_no').lean();
        const finalInstallments = await Installment.find({ loan_id: loan._id }).sort('installment_no').lean();

        res.status(201).json({
            ...populatedLoan,
            id: populatedLoan._id,
            account_no: populatedLoan.account_id.account_no,
            installments: finalInstallments.map(i => ({...i, id: i._id}))
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/loans/:id/installments/:installmentNo — pay an installment
router.put('/:id/installments/:installmentNo', requireAdmin, async (req, res) => {
    try {
        const { paid_amount } = req.body;
        const paidAmountNum = Number(paid_amount);

        if (paid_amount === undefined || isNaN(paidAmountNum) || paidAmountNum < 0) {
            return res.status(400).json({ error: 'Valid paid amount is required' });
        }

        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ error: 'Loan not found' });

        const installment = await Installment.findOne({ loan_id: loan._id, installment_no: req.params.installmentNo });
        if (!installment) return res.status(404).json({ error: 'Installment not found' });

        if (installment.is_paid) return res.status(400).json({ error: 'Installment already paid' });

        const actualPaid = paidAmountNum;

        installment.paid_amount = actualPaid;
        installment.is_paid = true;
        installment.paid_date = new Date().toISOString().split('T')[0];
        await installment.save();

        let excess = actualPaid - installment.default_amount;
        if (excess > 0) {
            const futureInstallments = await Installment.find({
                loan_id: loan._id,
                installment_no: { $gt: req.params.installmentNo },
                is_paid: false
            }).sort('installment_no');

            for (const future of futureInstallments) {
                if (excess <= 0) break;

                if (excess >= future.default_amount) {
                    excess -= future.default_amount;
                    future.paid_amount = 0;
                    future.default_amount = 0;
                    future.is_paid = true;
                    future.paid_date = new Date().toISOString().split('T')[0];
                    await future.save();
                } else {
                    future.default_amount -= excess;
                    excess = 0;
                    await future.save();
                }
            }
        }

        const allInstallments = await Installment.find({ loan_id: loan._id });
        const totalPaid = allInstallments.reduce((sum, i) => sum + i.paid_amount, 0);
        const remainingBalance = allInstallments.reduce((sum, i) => i.is_paid ? sum : sum + i.default_amount, 0);
        const allPaid = allInstallments.every(i => i.is_paid);

        loan.total_paid = totalPaid;
        loan.remaining_balance = remainingBalance;
        loan.status = allPaid ? 'completed' : 'active';
        await loan.save();

        const balance = await SocietyBalance.findOne();
        if (balance) {
            balance.total_balance += actualPaid;
            balance.total_pending_loans -= actualPaid;
            
            // If loan just finished, add its interest to global tracking pool
            if (loan.status === 'completed') {
                balance.total_lifetime_interest_earned += loan.interest;
            }
            
            await balance.save();
        }

        const updatedLoan = await Loan.findById(loan._id).populate('account_id', 'account_no').lean();
        const updatedInstallments = await Installment.find({ loan_id: loan._id }).sort('installment_no').lean();

        res.json({
            ...updatedLoan,
            id: updatedLoan._id,
            account_no: updatedLoan.account_id.account_no,
            installments: updatedInstallments.map(i => ({...i, id: i._id}))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/loans/:id — delete a loan
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ error: 'Loan not found' });

        const balance = await SocietyBalance.findOne();
        if (balance) {
            balance.total_balance += (loan.principal - loan.total_paid);
            balance.total_pending_loans -= loan.remaining_balance;
            await balance.save();
        }

        await Installment.deleteMany({ loan_id: loan._id });
        await Loan.findByIdAndDelete(loan._id);

        res.json({ message: 'Loan deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
