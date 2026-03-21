const mongoose = require('mongoose');

const monthlyFeeSchema = new mongoose.Schema({
    member_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true }, // 2018+
    amount: { type: Number, default: 500 },
    is_paid: { type: Boolean, default: false },
    paid_date: { type: Date }
});

// Ensure uniqueness per member per month
monthlyFeeSchema.index({ member_id: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyFee', monthlyFeeSchema);
