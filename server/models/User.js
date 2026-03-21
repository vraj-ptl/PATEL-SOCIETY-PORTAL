const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'member'] },
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
