const Category = require('../models/category.model');
const mongoose = require('mongoose');

exports.getCategories = async (req, res) => {
    try {
        const result = await Category.find({});
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.createCategory = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }

    const fields = validate(['name'], req.body);
    if (fields.length) {
        res.status(400).json({ error: 'Missing fields', fields });
        return;
    }

    try {
        const category = new Category(req.body);
        const result = await category.save();
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.updateCategory = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid category id' });
        return;
    }

    try {
        const result = await Category.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!result) {
            res.status(404).json({ error: 'Category not found' });
            return;
        }
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.deleteCategory = async (req, res) => {
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid category id' });
        return;
    }

    try {
        const result = await Category.findByIdAndDelete(req.params.id);
        if (!result) {
            res.status(404).json({ error: 'Category not found' });
            return;
        }
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

function validate(fields, body) {
    return fields.filter((field) => {
        if (typeof body[field] === 'undefined') {
            return field;
        }
        return false;
    });
}
