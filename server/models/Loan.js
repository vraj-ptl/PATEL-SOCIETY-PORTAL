const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    member_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: false },
    principal: { type: Number, required: true, enum: [50000, 100000] },
    time_period_years: { type: Number, required: true, enum: [1, 2] },
    interest: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    total_installments: { type: Number, required: true },
    start_month: { type: Number, required: true },
    start_year: { type: Number, required: true },
    remaining_balance: { type: Number, required: true },
    total_paid: { type: Number, required: true, default: 0 },
    status: { type: String, required: true, enum: ['active', 'completed'], default: 'active' },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Loan', loanSchema);
