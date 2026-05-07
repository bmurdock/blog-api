const mongoose = require('mongoose');
const Post = require('../models/post.model');
const { findPage } = require('./pagination');

exports.createPost = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }

    // A post needs text plus IDs that connect it to a category and author.
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
    // Validate IDs at the edge of the app before passing them to Mongoose.
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid post id' });
        return;
    }

    try {
        const result = await Post.findByIdAndUpdate(req.params.id, req.body, {
            // `new: true` sends back the changed post, not the old version.
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
        // Keep list endpoints consistent by sharing the pagination helper.
        const result = await findPage(Post.find({}), req.query);
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.categoryPosts = async (req, res) => {
    try {
        // This endpoint shows filtering: only posts whose category matches the URL.
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
    // Return a list of missing field names so API clients can correct the request.
    return fields.filter((field) => {
        if (typeof body[field] === 'undefined') {
            return field;
        }
        return false;
    });
}
