const express = require('express');
const router = express.Router();
const { requireLogin, requireAdmin } = require('../middleware/auth');
const ExpenditureCategory = require('../models/ExpenditureCategory');
const Expenditure = require('../models/Expenditure');
const SocietyBalance = require('../models/SocietyBalance');

// --- Categories ---

// GET all categories
router.get('/categories', requireLogin, async (req, res) => {
    try {
        const categories = await ExpenditureCategory.find().sort({ name: 1 });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new category
router.post('/categories', requireAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const existing = await ExpenditureCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) return res.status(400).json({ error: 'Category already exists' });

        const category = await ExpenditureCategory.create({ name });
        res.status(201).json(category);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a category
router.delete('/categories/:id', requireAdmin, async (req, res) => {
    try {
        const inUse = await Expenditure.exists({ category_id: req.params.id });
        if (inUse) {
            return res.status(400).json({ error: 'Cannot delete category in use by expenditures' });
        }
        await ExpenditureCategory.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Expenditures ---

// GET all expenditures
router.get('/', requireLogin, async (req, res) => {
    try {
        const expenditures = await Expenditure.find()
            .populate('category_id')
            .sort({ date: -1, recorded_at: -1 });
        
        const formatted = expenditures.map(exp => ({
            id: exp._id,
            category_id: exp.category_id._id,
            category_name: exp.category_id.name,
            amount: exp.amount,
            description: exp.description,
            date: exp.date,
            recorded_at: exp.recorded_at
        }));
        
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new expenditure
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { category_id, amount, description, date } = req.body;
        const amountNum = Number(amount);

        if (!category_id || !amountNum || amountNum <= 0 || !description || !date) {
            return res.status(400).json({ error: 'All fields are required and amount must be positive' });
        }

        const category = await ExpenditureCategory.findById(category_id);
        if (!category) return res.status(404).json({ error: 'Category not found' });

        const balance = await SocietyBalance.findOne();
        if (!balance) return res.status(500).json({ error: 'Society Balance record not found' });

        // Create expenditure
        const expenditure = new Expenditure({
            category_id,
            amount: amountNum,
            description,
            date: new Date(date)
        });
        await expenditure.save();

        // Update Society Balance
        balance.total_balance -= amountNum;
        balance.total_expenditure = (balance.total_expenditure || 0) + amountNum;
        await balance.save();

        const populated = await Expenditure.findById(expenditure._id).populate('category_id');

        res.status(201).json({
            id: populated._id,
            category_id: populated.category_id._id,
            category_name: populated.category_id.name,
            amount: populated.amount,
            description: populated.description,
            date: populated.date,
            recorded_at: populated.recorded_at,
            message: `Successfully recorded and deducted ₹${amountNum} from Society Balance.`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE (Undo) expenditure
router.delete('/:id/undo', requireAdmin, async (req, res) => {
    try {
        const expenditure = await Expenditure.findById(req.params.id);
        if (!expenditure) return res.status(404).json({ error: 'Expenditure not found' });

        const balance = await SocietyBalance.findOne();
        if (balance) {
            balance.total_balance += expenditure.amount;
            balance.total_expenditure -= expenditure.amount;
            await balance.save();
        }

        await Expenditure.findByIdAndDelete(req.params.id);

        res.json({ message: `Expenditure reversed. ₹${expenditure.amount} added back to Society Balance.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
