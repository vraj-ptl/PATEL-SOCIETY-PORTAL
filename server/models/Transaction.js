const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: { type: String, required: true }, // e.g. LOAN_ISSUE, LOAN_INSTALLMENT, FEE_PAYMENT, EXPENDITURE, ACCOUNTING
    amount: { type: Number, required: true },
    balance_before: { type: Number, required: true },
    balance_after: { type: Number, required: true },
    description: { type: String, required: true },
    is_deduction: { type: Boolean, required: true }, // true if funds were removed from SocietyBalance, false if added
    date: { type: Date, required: true },
    recorded_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
