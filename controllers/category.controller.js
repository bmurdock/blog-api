const Category = require('../models/category.model');
const mongoose = require('mongoose');

exports.getCategories = (req, res, next) => {
    const query = {};
    Category.find(query, (err, result) => {
        if (err) {
            res.status(400).json(err);
            return;
        }
        res.json(result);
    });
}

exports.createCategory = (req, res, next) => {
    if (typeof req.body !== 'undefined') {
        const fields = validate(['name'], req.body);
        if (fields.length) {
            res.status(400).json({ "error": "Missing fields", "fields": fields })
            return;
        }
        let category = new Category(req.body);
        category.save((err, result) => {
            if (err) {
                res.status(400).json(err);
                return;
            }
            res.json(result);
        });
    }
    else {
        res.status(400).json({ "error": "Request not valid" });
    }
}

exports.updateCategory = (req, res, next) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ "error": "Request not valid" });
        return;
    }
    if (typeof req.params.id === 'string' && mongoose.Types.ObjectId.isValid(req.params.id)) {
        const query = { _id: req.params.id };
        const update = req.body;
        Category.findByIdAndUpdate(query, update, (err, result) => {
            if (err) {
                res.status(400).json(err);
                return;
            }
            res.json(result);
        });
    }
    else {
        res.status(400).json({ "error": "Invalid category id" });
    }
}

exports.deleteCategory = (req, res, next) => {
    if (typeof req.params.id === 'string' && mongoose.Types.ObjectId.isValid(req.params.id)) {
        const query = {
            _id: req.params.id
        };
        Category.findByIdAndDelete(query, (err, result) => {
            if (err) {
                res.status(400).json(err);
                return;
            }
            res.json(result);
        });
    }
    else {
        res.status(400).json({ "error": "Invalid category id" });
    }
}

function validate(fields, body) {
    return fields.filter((field) => {
        if (typeof body[field] === 'undefined') {
            return field;
        }
    });
}