const mongoose = require('mongoose');

const expenditureSchema = new mongoose.Schema({
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenditureCategory', required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    recorded_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expenditure', expenditureSchema);
