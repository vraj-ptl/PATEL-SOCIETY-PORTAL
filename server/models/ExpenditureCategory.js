const mongoose = require('mongoose');

const expenditureCategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ExpenditureCategory', expenditureCategorySchema);
