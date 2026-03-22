const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    name: { type: String, required: true },
    village: { type: String, required: true },
    phone: { type: String, required: false },
    position: { type: Number, required: true },
    join_date: { type: Date, default: Date.now },
    wallet_balance: { type: Number, default: 0 },
    total_principal_paid: { type: Number, default: 0 }
});

module.exports = mongoose.model('Member', memberSchema);
