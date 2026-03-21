const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    account_no: { type: String, required: true, unique: true },
    wallet_balance: { type: Number, default: 0 },
    pending_fees: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Account', accountSchema);
