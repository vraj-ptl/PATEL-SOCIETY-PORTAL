const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { requireLogin, requireAdmin } = require('../middleware/auth');
const Account = require('../models/Account');
const Member = require('../models/Member');
const User = require('../models/User');
const Loan = require('../models/Loan');
const SocietyBalance = require('../models/SocietyBalance');
const MonthlyFee = require('../models/MonthlyFee');

const FEE_START_YEAR = 2018;
const FEE_START_MONTH = 8; // August

// Auto-create paid MonthlyFee records for all months from Aug 2018 to current month
async function createPastFeeRecords(memberId, accountId, joinDate) {
    const now = joinDate || new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const feeRecords = [];
    for (let y = FEE_START_YEAR; y <= currentYear; y++) {
        const startM = (y === FEE_START_YEAR) ? FEE_START_MONTH : 1;
        const endM = (y === currentYear) ? currentMonth : 12;
        for (let m = startM; m <= endM; m++) {
            feeRecords.push({
                member_id: memberId,
                account_id: accountId,
                month: m,
                year: y,
                amount: 500,
                is_paid: true,
                paid_date: now
            });
        }
    }

    if (feeRecords.length > 0) {
        // Use ordered: false so duplicates are silently skipped
        try {
            await MonthlyFee.insertMany(feeRecords, { ordered: false });
        } catch (err) {
            // Ignore duplicate key errors (code 11000), throw others
            if (err.code !== 11000 && !(err.writeErrors && err.writeErrors.every(e => e.err.code === 11000))) {
                throw err;
            }
        }
    }
}

// GET /api/accounts — list all accounts with their members
router.get('/', requireLogin, async (req, res) => {
    try {
        const accounts = await Account.find().sort('account_no').lean();

        const result = await Promise.all(accounts.map(async (acc) => {
            const members = await Member.find({ account_id: acc._id }).sort('position').lean();
            return { ...acc, id: acc._id, members: members.map(m => ({...m, id: m._id})) };
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/accounts/:accountNo — get single account
router.get('/:accountNo', requireLogin, async (req, res) => {
    try {
        const account = await Account.findOne({ account_no: req.params.accountNo }).lean();
        if (!account) return res.status(404).json({ error: 'Account not found' });

        if (req.session.user.role === 'member' && req.session.user.account_id !== account._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const members = await Member.find({ account_id: account._id }).sort('position').lean();
        res.json({ ...account, id: account._id, members: members.map(m => ({...m, id: m._id})) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/accounts — create new account with members
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { account_no, members, username, password } = req.body;

        if (!account_no) return res.status(400).json({ error: 'Account number is required' });
        const existing = await Account.findOne({ account_no });
        if (existing) return res.status(400).json({ error: 'Account number already exists' });

        if (!members || !Array.isArray(members) || members.length === 0) return res.status(400).json({ error: 'At least one member is required' });
        if (members.length > 6) return res.status(400).json({ error: 'Maximum 6 members allowed per account' });

        for (const member of members) {
            if (!member.name || !member.village || !member.phone) {
                return res.status(400).json({ error: 'Name, village, and phone are required for all members' });
            }
        }

        if (username && password) {
            if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 length' });
            const existingUser = await User.findOne({ username });
            if (existingUser) return res.status(400).json({ error: 'Username already exists' });
        }

        const newAccount = new Account({ account_no });
        await newAccount.save();

        const memberDocs = members.map((m, i) => ({
            account_id: newAccount._id, name: m.name, village: m.village, phone: m.phone, position: i + 1
        }));
        const createdMembers = await Member.insertMany(memberDocs);

        // Auto-mark all past months as paid for each new member
        for (const member of createdMembers) {
            await createPastFeeRecords(member._id, newAccount._id, member.join_date);
        }

        if (username && password) {
            const hash = bcrypt.hashSync(password, 10);
            await User.create({ username, password_hash: hash, role: 'member', account_id: newAccount._id });
        }

        const finalMembers = await Member.find({ account_id: newAccount._id }).sort('position').lean();
        res.status(201).json({ ...newAccount.toObject(), id: newAccount._id, members: finalMembers.map(m => ({...m, id: m._id})) });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/accounts/:accountNo/members — add member to account
router.post('/:accountNo/members', requireAdmin, async (req, res) => {
    try {
        const account = await Account.findOne({ account_no: req.params.accountNo });
        if (!account) return res.status(404).json({ error: 'Account not found' });

        const existingCount = await Member.countDocuments({ account_id: account._id });
        if (existingCount >= 6) return res.status(400).json({ error: 'Maximum 6 members allowed per account' });

        const { name, village, phone } = req.body;
        if (!name || !village || !phone) return res.status(400).json({ error: 'Name, village, and phone are required' });

        const newMember = await Member.create({ account_id: account._id, name, village, phone, position: existingCount + 1 });

        // Auto-mark all past months as paid for the new member
        await createPastFeeRecords(newMember._id, account._id, newMember.join_date);

        const members = await Member.find({ account_id: account._id }).sort('position').lean();
        res.status(201).json({ ...account.toObject(), id: account._id, members: members.map(m => ({...m, id: m._id})) });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/accounts/:id/pay-fees
router.post('/:id/pay-fees', requireAdmin, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

        const account = await Account.findById(req.params.id);
        if (!account) return res.status(404).json({ error: 'Account not found' });
        
        if (amount > account.pending_fees) return res.status(400).json({ error: 'Cannot overpay pending fees' });

        account.pending_fees -= Number(amount);
        await account.save();

        const balance = await SocietyBalance.findOne();
        if (balance) {
            balance.total_balance += Number(amount);
            await balance.save();
        }

        res.json({ message: 'Fees paid successfully', account });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/accounts/:id/use-wallet
router.post('/:id/use-wallet', requireAdmin, async (req, res) => {
    try {
        const account = await Account.findById(req.params.id);
        if (!account) return res.status(404).json({ error: 'Account not found' });
        
        if (account.wallet_balance <= 0) return res.status(400).json({ error: 'No wallet balance available' });
        if (account.pending_fees <= 0) return res.status(400).json({ error: 'No pending fees to pay' });

        let deductAmt = Math.min(account.wallet_balance, account.pending_fees);

        account.wallet_balance -= deductAmt;
        account.pending_fees -= deductAmt;
        await account.save();

        // Since wallet balance already came from society funds previously when distributed, 
        // paying via wallet essentially puts the money into the Society Balance manually as 'fee received'.
        const balance = await SocietyBalance.findOne();
        if (balance) {
            balance.total_balance += deductAmt;
            await balance.save();
        }

        res.json({ message: `Successfully claimed ₹${deductAmt} from wallet to pay fees`, account });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/accounts/:id — update a member
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);
        if (!member) return res.status(404).json({ error: 'Member not found' });
        const { name, village, phone } = req.body;

        member.name = name || member.name;
        member.village = village || member.village;
        member.phone = phone || member.phone;
        await member.save();

        res.json({ ...member.toObject(), id: member._id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/accounts/member/:id — delete a member
router.delete('/member/:id', requireAdmin, async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);
        if (!member) return res.status(404).json({ error: 'Member not found' });

        const accountId = member.account_id;
        await Member.findByIdAndDelete(req.params.id);

        const remaining = await Member.find({ account_id: accountId }).sort('position');
        for (let i = 0; i < remaining.length; i++) {
            remaining[i].position = i + 1;
            await remaining[i].save();
        }

        res.json({ message: 'Member deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/accounts/:accountNo — delete entire account
router.delete('/:accountNo', requireAdmin, async (req, res) => {
    try {
        const account = await Account.findOne({ account_no: req.params.accountNo });
        if (!account) return res.status(404).json({ error: 'Account not found' });

        const activeLoans = await Loan.countDocuments({ account_id: account._id, status: 'active' });
        if (activeLoans > 0) return res.status(400).json({ error: 'Cannot delete account with active loans. Clear loans first.' });

        await User.deleteMany({ account_id: account._id });
        await Member.deleteMany({ account_id: account._id });
        await Account.findByIdAndDelete(account._id);

        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
