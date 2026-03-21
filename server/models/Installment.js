const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
    loan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
    installment_no: { type: Number, required: true },
    month_label: { type: String, required: true },
    default_amount: { type: Number, required: true },
    paid_amount: { type: Number, required: true, default: 0 },
    is_paid: { type: Boolean, required: true, default: false },
    paid_date: { type: String }
});

installmentSchema.index({ loan_id: 1, installment_no: 1 }, { unique: true });

module.exports = mongoose.model('Installment', installmentSchema);
