const express = require('express');
const router = express.Router();
const { getOne, getAll, runQuery } = require('../database');
const bcrypt = require('bcryptjs');
const { requireLogin, requireAdmin } = require('../middleware/auth');

// GET /api/accounts — list all accounts with their members
router.get('/', requireLogin, (req, res) => {
    try {
        let accounts;
        if (req.session.user.role === 'admin') {
            accounts = getAll('SELECT * FROM accounts ORDER BY account_no');
        } else {
            accounts = getAll('SELECT * FROM accounts WHERE id = ?', [req.session.user.account_id]);
        }

        const result = accounts.map(acc => {
            const members = getAll('SELECT * FROM members WHERE account_id = ? ORDER BY position', [acc.id]);
            return { ...acc, members };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/accounts/:accountNo — get single account
router.get('/:accountNo', requireLogin, (req, res) => {
    try {
        const account = getOne('SELECT * FROM accounts WHERE account_no = ?', [req.params.accountNo]);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (req.session.user.role === 'member' && req.session.user.account_id !== account.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const members = getAll('SELECT * FROM members WHERE account_id = ? ORDER BY position', [account.id]);
        res.json({ ...account, members });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/accounts — create new account with members
router.post('/', requireAdmin, (req, res) => {
    try {
        const { account_no, members, username, password } = req.body;

        if (!account_no) {
            return res.status(400).json({ error: 'Account number is required' });
        }

        const existing = getOne('SELECT id FROM accounts WHERE account_no = ?', [account_no]);
        if (existing) {
            return res.status(400).json({ error: 'Account number already exists' });
        }

        if (!members || !Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ error: 'At least one member is required' });
        }

        if (members.length > 6) {
            return res.status(400).json({ error: 'Maximum 6 members allowed per account' });
        }

        const result = runQuery('INSERT INTO accounts (account_no) VALUES (?)', [account_no]);
        const accountId = result.lastInsertRowid;

        members.forEach((member, index) => {
            if (!member.name || !member.village || !member.phone) {
                throw new Error(`Member ${index + 1}: name, village, and phone are required`);
            }
            runQuery('INSERT INTO members (account_id, name, village, phone, position) VALUES (?, ?, ?, ?, ?)',
                [accountId, member.name, member.village, member.phone, index + 1]);
        });

        // Create login credentials for this account
        if (username && password) {
            const existingUser = getOne('SELECT id FROM users WHERE username = ?', [username]);
            if (existingUser) {
                throw new Error('Username already exists');
            }
            const hash = bcrypt.hashSync(password, 10);
            runQuery("INSERT INTO users (username, password_hash, role, account_id) VALUES (?, ?, 'member', ?)",
                [username, hash, accountId]);
        }

        const account = getOne('SELECT * FROM accounts WHERE id = ?', [accountId]);
        const membersList = getAll('SELECT * FROM members WHERE account_id = ? ORDER BY position', [accountId]);

        res.status(201).json({ ...account, members: membersList });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/accounts/:accountNo/members — add member to account
router.post('/:accountNo/members', requireAdmin, (req, res) => {
    try {
        const account = getOne('SELECT * FROM accounts WHERE account_no = ?', [req.params.accountNo]);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const existingMembers = getOne('SELECT COUNT(*) as count FROM members WHERE account_id = ?', [account.id]);
        if (existingMembers.count >= 6) {
            return res.status(400).json({ error: 'Maximum 6 members allowed per account' });
        }

        const { name, village, phone } = req.body;
        if (!name || !village || !phone) {
            return res.status(400).json({ error: 'Name, village, and phone are required' });
        }

        const nextPosition = existingMembers.count + 1;
        runQuery('INSERT INTO members (account_id, name, village, phone, position) VALUES (?, ?, ?, ?, ?)',
            [account.id, name, village, phone, nextPosition]);

        const members = getAll('SELECT * FROM members WHERE account_id = ? ORDER BY position', [account.id]);
        res.status(201).json({ ...account, members });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/accounts/:id — update a member
router.put('/:id', requireAdmin, (req, res) => {
    try {
        const member = getOne('SELECT * FROM members WHERE id = ?', [parseInt(req.params.id)]);
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const { name, village, phone } = req.body;
        runQuery('UPDATE members SET name = ?, village = ?, phone = ? WHERE id = ?',
            [name || member.name, village || member.village, phone || member.phone, parseInt(req.params.id)]);

        const updated = getOne('SELECT * FROM members WHERE id = ?', [parseInt(req.params.id)]);
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/accounts/member/:id — delete a member
router.delete('/member/:id', requireAdmin, (req, res) => {
    try {
        const member = getOne('SELECT * FROM members WHERE id = ?', [parseInt(req.params.id)]);
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        runQuery('DELETE FROM members WHERE id = ?', [parseInt(req.params.id)]);

        // Re-order positions
        const remaining = getAll('SELECT * FROM members WHERE account_id = ? ORDER BY position', [member.account_id]);
        remaining.forEach((m, index) => {
            runQuery('UPDATE members SET position = ? WHERE id = ?', [index + 1, m.id]);
        });

        res.json({ message: 'Member deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/accounts/:accountNo — delete entire account
router.delete('/:accountNo', requireAdmin, (req, res) => {
    try {
        const account = getOne('SELECT * FROM accounts WHERE account_no = ?', [req.params.accountNo]);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const activeLoans = getOne("SELECT COUNT(*) as count FROM loans WHERE account_id = ? AND status = 'active'", [account.id]);
        if (activeLoans.count > 0) {
            return res.status(400).json({ error: 'Cannot delete account with active loans. Clear loans first.' });
        }

        runQuery('DELETE FROM users WHERE account_id = ?', [account.id]);
        runQuery('DELETE FROM members WHERE account_id = ?', [account.id]);
        runQuery('DELETE FROM accounts WHERE id = ?', [account.id]);

        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
