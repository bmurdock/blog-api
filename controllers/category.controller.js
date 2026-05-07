const Category = require('../models/category.model');
const { findPage } = require('./pagination');
const {
    isValidObjectId,
    pickFields,
    sendControllerError,
    validateRequired
} = require('./request-helpers');

exports.getCategories = async (req, res) => {
    try {
        // `req.query` contains values from the URL, such as ?page=2&limit=10.
        const result = await findPage(Category.find({ deletedAt: null }), req.query);
        res.json(result);
    } catch (err) {
        sendControllerError(res, err);
    }
};

exports.createCategory = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }

    // Do simple request validation before asking Mongoose to save anything.
    const fields = validateRequired(['name'], req.body);
    if (fields.length) {
        res.status(400).json({ error: 'Missing fields', fields });
        return;
    }

    try {
        const category = new Category(pickFields(req.body, ['name', 'icon']));
        const result = await category.save();
        res.json(result);
    } catch (err) {
        sendControllerError(res, err);
    }
};

exports.updateCategory = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }
    // Invalid ObjectIds can make Mongoose throw a cast error. Checking early
    // lets the API send a clearer 400 response.
    if (!isValidObjectId(req.params.id)) {
        res.status(400).json({ error: 'Invalid category id' });
        return;
    }

    try {
        const updates = pickFields(req.body, ['name', 'icon']);
        if (!Object.keys(updates).length) {
            const result = await Category.findOne({ _id: req.params.id, deletedAt: null });
            if (!result) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
            res.json(result);
            return;
        }

        const result = await Category.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { $set: updates }, {
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
        sendControllerError(res, err);
    }
};

exports.deleteCategory = async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        res.status(400).json({ error: 'Invalid category id' });
        return;
    }

    try {
        // This is a soft delete: normal category lists hide the document, but old
        // posts still point at a real category. That avoids dangling references
        // without introducing MongoDB transactions in this beginner demo.
        const result = await Category.findOneAndUpdate(
            { _id: req.params.id, deletedAt: null },
            { $set: { deletedAt: new Date() } },
            { new: true }
        );
        if (!result) {
            res.status(404).json({ error: 'Category not found' });
            return;
        }
        res.json(result);
    } catch (err) {
        sendControllerError(res, err);
    }
};
