const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Account = require('../models/Account');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.user = {
            id: user._id,
            username: user.username,
            role: user.role,
            account_id: user.account_id
        };

        res.json({
            message: 'Login successful',
            user: req.session.user
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { username, accountNo, newPassword } = req.body;
        if (!username || !accountNo || !newPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const account = await Account.findOne({ account_no: accountNo });
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const user = await User.findOne({ username, account_id: account._id });
        if (!user) {
            return res.status(404).json({ error: 'Invalid details provided.' });
        }

        const hash = bcrypt.hashSync(newPassword, 10);
        user.password_hash = hash;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    res.json({ user: req.session.user });
});

module.exports = router;
