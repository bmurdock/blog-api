const Category = require('../models/category.model');
const mongoose = require('mongoose');
const Post = require('../models/post.model');
const { findPage } = require('./pagination');

exports.getCategories = async (req, res) => {
    try {
        // `req.query` contains values from the URL, such as ?page=2&limit=10.
        const result = await findPage(Category.find({}), req.query);
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

    // Do simple request validation before asking Mongoose to save anything.
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
    // Invalid ObjectIds can make Mongoose throw a cast error. Checking early
    // lets the API send a clearer 400 response.
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid category id' });
        return;
    }

    try {
        const result = await Category.findByIdAndUpdate(req.params.id, req.body, {
            // Return the updated document and run schema validators on the update.
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
        // Keep posts from pointing at a category that no longer exists.
        const referencedPost = await Post.exists({ category: req.params.id });
        if (referencedPost) {
            res.status(409).json({ error: 'Category has posts' });
            return;
        }

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
    // Return a list of missing field names so the client knows what to fix.
    return fields.filter((field) => {
        if (typeof body[field] === 'undefined') {
            return field;
        }
        return false;
    });
}
