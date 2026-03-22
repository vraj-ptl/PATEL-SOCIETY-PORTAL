const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/society';

async function initializeDatabase() {
    // If already connected, skip
    if (mongoose.connection.readyState === 1) {
        return;
    }

    console.log('  ⏳ Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('  ✅ Connected to MongoDB');

    // Seed default data
    const User = require('./models/User');
    const SocietyBalance = require('./models/SocietyBalance');

    const balance = await SocietyBalance.findOne();
    if (!balance) {
        await SocietyBalance.create({ total_balance: 0, total_pending_loans: 0 });
        console.log('  ✅ Created default SocietyBalance');
    }

    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
        const hash = bcrypt.hashSync('admin123', 10);
        await User.create({ username: 'admin', password_hash: hash, role: 'admin' });
        console.log('  ✅ Created default admin user');
    }
}

module.exports = { initializeDatabase };
