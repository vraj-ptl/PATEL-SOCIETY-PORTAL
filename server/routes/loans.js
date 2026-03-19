const express = require('express');
const router = express.Router();
const { getOne, getAll, runQuery } = require('../database');
const { requireLogin, requireAdmin } = require('../middleware/auth');

// Loan plan configurations
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
router.get('/', requireLogin, (req, res) => {
    try {
        let loans;
        if (req.session.user.role === 'admin') {
            loans = getAll(`
                SELECT l.*, a.account_no 
                FROM loans l 
                JOIN accounts a ON l.account_id = a.id 
                ORDER BY l.created_at DESC
            `);
        } else {
            loans = getAll(`
                SELECT l.*, a.account_no 
                FROM loans l 
                JOIN accounts a ON l.account_id = a.id 
                WHERE l.account_id = ?
                ORDER BY l.created_at DESC
            `, [req.session.user.account_id]);
        }

        const result = loans.map(loan => {
            const member = getOne('SELECT name FROM members WHERE account_id = ? ORDER BY position LIMIT 1', [loan.account_id]);
            return { ...loan, member_name: member ? member.name : 'Unknown' };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/loans/:id — get loan detail with installments
router.get('/:id', requireLogin, (req, res) => {
    try {
        const loan = getOne(`
            SELECT l.*, a.account_no 
            FROM loans l 
            JOIN accounts a ON l.account_id = a.id 
            WHERE l.id = ?
        `, [parseInt(req.params.id)]);

        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }

        if (req.session.user.role === 'member' && req.session.user.account_id !== loan.account_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const installments = getAll('SELECT * FROM installments WHERE loan_id = ? ORDER BY installment_no', [loan.id]);
        const members = getAll('SELECT name FROM members WHERE account_id = ? ORDER BY position', [loan.account_id]);

        res.json({ ...loan, installments, members: members.map(m => m.name) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/loans — create new loan
router.post('/', requireAdmin, (req, res) => {
    try {
        const { account_no, principal, time_period_years, start_month, start_year } = req.body;

        if (!account_no || !principal || !time_period_years || !start_month || !start_year) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const account = getOne('SELECT * FROM accounts WHERE account_no = ?', [account_no]);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const planKey = `${principal}_${time_period_years}`;
        const plan = LOAN_PLANS[planKey];
        if (!plan) {
            return res.status(400).json({ error: 'Invalid loan plan' });
        }

        const result = runQuery(`
            INSERT INTO loans (account_id, principal, time_period_years, interest, total_amount, total_installments, start_month, start_year, remaining_balance, total_paid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [account.id, plan.principal, time_period_years, plan.interest,
            plan.totalAmount, plan.installments.length, start_month, start_year, plan.totalAmount]);

        const loanId = result.lastInsertRowid;

        plan.installments.forEach((inst, index) => {
            const monthLabel = getMonthLabel(start_month, start_year, index);
            runQuery(`
                INSERT INTO installments (loan_id, installment_no, month_label, default_amount, paid_amount, is_paid)
                VALUES (?, ?, ?, ?, 0, 0)
            `, [loanId, index + 1, monthLabel, inst.amount]);
        });

        // Update society balance
        runQuery(`
            UPDATE society_balance SET 
                total_balance = total_balance - ?,
                total_pending_loans = total_pending_loans + ?
            WHERE id = 1
        `, [plan.principal, plan.totalAmount]);

        const loan = getOne('SELECT l.*, a.account_no FROM loans l JOIN accounts a ON l.account_id = a.id WHERE l.id = ?', [loanId]);
        const installments = getAll('SELECT * FROM installments WHERE loan_id = ? ORDER BY installment_no', [loanId]);

        res.status(201).json({ ...loan, installments });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/loans/:id/installments/:installmentNo — pay an installment
router.put('/:id/installments/:installmentNo', requireAdmin, (req, res) => {
    try {
        const { paid_amount } = req.body;
        const loanId = parseInt(req.params.id);
        const installmentNo = parseInt(req.params.installmentNo);

        if (paid_amount === undefined || paid_amount < 0) {
            return res.status(400).json({ error: 'Valid paid amount is required' });
        }

        const loan = getOne('SELECT * FROM loans WHERE id = ?', [loanId]);
        if (!loan) return res.status(404).json({ error: 'Loan not found' });

        const installment = getOne('SELECT * FROM installments WHERE loan_id = ? AND installment_no = ?', [loanId, installmentNo]);
        if (!installment) return res.status(404).json({ error: 'Installment not found' });

        if (installment.is_paid) return res.status(400).json({ error: 'Installment already paid' });

        const actualPaid = paid_amount;

        // Mark current installment as paid
        runQuery("UPDATE installments SET paid_amount = ?, is_paid = 1, paid_date = date('now') WHERE loan_id = ? AND installment_no = ?",
            [actualPaid, loanId, installmentNo]);

        // Handle overpayment
        let excess = actualPaid - installment.default_amount;
        if (excess > 0) {
            const futureInstallments = getAll(
                'SELECT * FROM installments WHERE loan_id = ? AND installment_no > ? AND is_paid = 0 ORDER BY installment_no',
                [loanId, installmentNo]
            );

            for (const future of futureInstallments) {
                if (excess <= 0) break;

                if (excess >= future.default_amount) {
                    runQuery("UPDATE installments SET paid_amount = 0, default_amount = 0, is_paid = 1, paid_date = date('now') WHERE id = ?",
                        [future.id]);
                    excess -= future.default_amount;
                } else {
                    runQuery('UPDATE installments SET default_amount = default_amount - ? WHERE id = ?',
                        [excess, future.id]);
                    excess = 0;
                }
            }
        }

        // Update loan totals
        const allInstallments = getAll('SELECT * FROM installments WHERE loan_id = ?', [loanId]);
        const totalPaid = allInstallments.reduce((sum, i) => sum + i.paid_amount, 0);
        const remainingBalance = allInstallments.reduce((sum, i) => i.is_paid ? sum : sum + i.default_amount, 0);
        const allPaid = allInstallments.every(i => i.is_paid);

        runQuery('UPDATE loans SET total_paid = ?, remaining_balance = ?, status = ? WHERE id = ?',
            [totalPaid, remainingBalance, allPaid ? 'completed' : 'active', loanId]);

        // Update society balance
        runQuery('UPDATE society_balance SET total_balance = total_balance + ?, total_pending_loans = total_pending_loans - ? WHERE id = 1',
            [actualPaid, actualPaid]);

        const updatedLoan = getOne('SELECT l.*, a.account_no FROM loans l JOIN accounts a ON l.account_id = a.id WHERE l.id = ?', [loanId]);
        const updatedInstallments = getAll('SELECT * FROM installments WHERE loan_id = ? ORDER BY installment_no', [loanId]);

        res.json({ ...updatedLoan, installments: updatedInstallments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/loans/:id — delete a loan
router.delete('/:id', requireAdmin, (req, res) => {
    try {
        const loan = getOne('SELECT * FROM loans WHERE id = ?', [parseInt(req.params.id)]);
        if (!loan) return res.status(404).json({ error: 'Loan not found' });

        runQuery('UPDATE society_balance SET total_balance = total_balance + ?, total_pending_loans = total_pending_loans - ? WHERE id = 1',
            [loan.principal - loan.total_paid, loan.remaining_balance]);

        runQuery('DELETE FROM installments WHERE loan_id = ?', [loan.id]);
        runQuery('DELETE FROM loans WHERE id = ?', [loan.id]);

        res.json({ message: 'Loan deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
