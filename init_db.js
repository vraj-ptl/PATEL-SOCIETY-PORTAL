const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./server/models/User');
const SocietyBalance = require('./server/models/SocietyBalance');

async function initDB() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/society');
        console.log("Connected to DB...");
        
        let balance = await SocietyBalance.findOne();
        if (!balance) {
            await SocietyBalance.create({ total_balance: 0, total_pending_loans: 0, total_lifetime_interest_earned: 0 });
            console.log("Recreated SocietyBalance");
        }
        
        let adminUser = await User.findOne({ username: 'admin' });
        if (!adminUser) {
            const hash = bcrypt.hashSync('admin123', 10);
            await User.create({ username: 'admin', password_hash: hash, role: 'admin' });
            console.log("Recreated Admin User");
        }
        
        console.log("Database successfully seeded!");
    } catch(e) { 
        console.error("Error:", e); 
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

initDB();
