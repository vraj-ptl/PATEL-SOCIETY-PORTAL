const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const twilio = require('twilio');
const User = require('../models/User');
const Account = require('../models/Account');
const Member = require('../models/Member');

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

// POST /api/auth/forgot-password/request-otp
router.post('/forgot-password/request-otp', async (req, res) => {
    try {
        const { username, accountNo } = req.body;
        if (!username || !accountNo) {
            return res.status(400).json({ error: 'Username and Account Number are required' });
        }

        const account = await Account.findOne({ account_no: accountNo });
        if (!account) return res.status(404).json({ error: 'Account not found' });

        const user = await User.findOne({ username, account_id: account._id });
        if (!user) return res.status(404).json({ error: 'Invalid details provided.' });

        // Find primary member
        const member = await Member.findOne({ account_id: account._id }).sort('position');
        if (!member || !member.phone) {
            return res.status(400).json({ error: 'No phone number linked to this account.' });
        }

        const phone = member.phone;
        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        user.reset_otp = otp;
        user.reset_otp_expires = new Date(Date.now() + 90 * 1000); // 1.5 minutes
        await user.save();

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

        if (accountSid && authToken && twilioPhone) {
            try {
                const client = twilio(accountSid, authToken);
                let formattedPhone = phone;
                // Format basic Indian 10-digit number to E.164
                if (/^\d{10}$/.test(formattedPhone)) {
                    formattedPhone = '+91' + formattedPhone;
                } else if (!formattedPhone.startsWith('+')) {
                    formattedPhone = '+' + formattedPhone;
                }

                await client.messages.create({
                    body: `Your Patel Society Portal OTP is: ${otp}. Valid for 1.5 minutes.`,
                    from: twilioPhone,
                    to: formattedPhone
                });
                console.log(`\n=== TWILIO SMS SENT ===\nTo: ${formattedPhone}\nOTP: ${otp}\n=====================\n`);
            } catch (twilioErr) {
                console.error('Twilio SMS Failed:', twilioErr.message);
                console.log(`\n=== OTP GENERATED (TWILIO FAILED) ===\nSent to: ${phone}\nOTP: ${otp}\n=====================\n`);
            }
        } else {
            console.log(`\n=== OTP GENERATED (SIMULATED) ===\nSent to: ${phone}\nOTP: ${otp}\n=====================\n`);
            console.log("NOTE: To send real SMS, add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env\n");
        }

        const maskedPhone = phone.length >= 10 
            ? phone.substring(0, 2) + '*'.repeat(phone.length - 4) + phone.substring(phone.length - 2)
            : '*******' + phone.slice(-2);

        res.json({ message: 'OTP sent successfully', maskedPhone });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { username, accountNo, otp, newPassword } = req.body;
        if (!username || !accountNo || !otp || !newPassword) {
            return res.status(400).json({ error: 'All fields including OTP are required' });
        }

        const account = await Account.findOne({ account_no: accountNo });
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const user = await User.findOne({ username, account_id: account._id });
        if (!user) {
            return res.status(404).json({ error: 'Invalid details provided.' });
        }

        if (user.reset_otp !== otp || user.reset_otp_expires < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired OTP.' });
        }

        const hash = bcrypt.hashSync(newPassword, 10);
        user.password_hash = hash;
        user.reset_otp = undefined;
        user.reset_otp_expires = undefined;
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
