const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const SocietyBalance = require('./models/SocietyBalance');

const DB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/society';

async function initializeDatabase() {
    try {
        await mongoose.connect(DB_URI);
        console.log('  ✅ Connected to MongoDB');

        let balance = await SocietyBalance.findOne();
        if (!balance) {
            await SocietyBalance.create({ total_balance: 0, total_pending_loans: 0 });
        }

        let adminUser = await User.findOne({ username: 'admin' });
        if (!adminUser) {
            const hash = bcrypt.hashSync('admin123', 10);
            await User.create({ username: 'admin', password_hash: hash, role: 'admin' });
        }
    } catch (error) {
        console.error('Database connection error:', error);
        // Do not process.exit(1) in a serverless environment as it kills the execution instance
        throw error;
    }
}

module.exports = {
    initializeDatabase
};
