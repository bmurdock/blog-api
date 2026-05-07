const mongoose = require('mongoose');
const Post = require('../models/post.model');
const { findPage } = require('./pagination');

exports.createPost = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }

    const fields = validate(['title', 'body', 'category', 'author'], req.body);
    if (fields.length) {
        res.status(400).json({ error: 'Missing fields', fields });
        return;
    }

    try {
        const post = new Post(req.body);
        const result = await post.save();
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.updatePost = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid post id' });
        return;
    }

    try {
        const result = await Post.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!result) {
            res.status(404).json({ error: 'Post not found' });
            return;
        }
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.getPosts = async (req, res) => {
    try {
        const result = await findPage(Post.find({}), req.query);
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.categoryPosts = async (req, res) => {
    try {
        const result = await findPage(Post.find({ category: req.params.category }), req.query);
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.deletePost = async (req, res) => {
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid post id' });
        return;
    }

    try {
        const result = await Post.findByIdAndDelete(req.params.id);
        if (!result) {
            res.status(404).json({ error: 'Post not found' });
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
