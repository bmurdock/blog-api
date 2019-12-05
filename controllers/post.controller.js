const mongoose = require('mongoose');
const Post = require('../models/post.model');

exports.createPost = (req, res, next) => {
    if (typeof req.body !== 'undefined') {
        const fields = validate(['title', 'body', 'category', 'author'], req.body);
        if (fields.length) {
            res.status(400).json({ "error": "Missing fields", "fields": fields })
            return;
        }
        let post = new Post(req.body);
        post.save((err, result) => {
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
exports.updatePost = (req, res, next) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ "error": "Request not valid" });
        return;
    }
    if (typeof req.params.id === 'string' && mongoose.Types.ObjectId.isValid(req.params.id)) {
        const query = { _id: req.params.id };
        const update = req.body;
        Post.findByIdAndUpdate(query, update, (err, result) => {
            if (err) {
                res.status(400).json(err);
                return;
            }
            res.json(result);
        });
    }
    else {
        res.status(400).json({ "error": "Invalid post id" });
    }
}
exports.getPosts = (req, res, next) => {
    const query = {};
    Post.find(query, (err, result) => {
        if (err) {
            res.status(400).json(err);
            return;
        }
        res.json(result);
    });

}

exports.categoryPosts = (req, res, next) => {
    const query = {
        category: req.params.cateogry
    };
    Post.find(query, (err, result) => {
        if (err) {
            res.status(400).json(err);
            return;
        }
        res.json(result);
    });
}

exports.deletePost = (req, res, next) => {
    if (typeof req.params.id === 'string' && mongoose.Types.ObjectId.isValid(req.params.id)) {
        const query = {
            _id: req.params.id
        };
        Post.findByIdAndDelete(query, (err, result) => {
            if (err) {
                res.status(400).json(err);
                return;
            }
            res.json(result);
        });
    }
    else {
        res.status(400).json({ "error": "Invalid post id" });
    }
}

function validate(fields, body) {
    return fields.filter((field) => {
        if (typeof body[field] === 'undefined') {
            return field;
        }
    });
}