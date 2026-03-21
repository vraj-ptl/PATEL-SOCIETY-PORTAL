const mongoose = require('mongoose');

const societyBalanceSchema = new mongoose.Schema({
    total_balance: { type: Number, default: 0 },
    total_pending_loans: { type: Number, default: 0 },
    total_lifetime_interest_earned: { type: Number, default: 0 }
});

module.exports = mongoose.model('SocietyBalance', societyBalanceSchema);
