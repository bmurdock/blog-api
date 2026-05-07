const User = require('../models/user.model');
const mongoose = require('mongoose');
const Post = require('../models/post.model');
const { findPage } = require('./pagination');

exports.getUsers = async (req, res) => {
    try {
        const result = await findPage(User.find({}), req.query);
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.getUserById = async (req, res) => {
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid user id' });
        return;
    }

    try {
        const result = await User.findById(req.params.id);
        if (!result) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.createUser = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }

    const fields = validate(['username', 'email', 'password'], req.body);
    if (fields.length) {
        res.status(400).json({ error: 'Missing fields', fields });
        return;
    }

    try {
        const payload = { ...req.body };
        const pass = payload.password;
        delete payload.password;
        const user = new User(payload);
        await user.setPassword(pass);
        const result = await user.save();
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.updateUser = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid user id' });
        return;
    }

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const allowedFields = ['username', 'email', 'bio', 'image', 'avatar'];
        for (const field of allowedFields) {
            if (typeof req.body[field] !== 'undefined') {
                user[field] = req.body[field];
            }
        }
        if (typeof req.body.password === 'string' && req.body.password.length > 0) {
            await user.setPassword(req.body.password);
        }

        const result = await user.save();
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.deleteUser = async (req, res) => {
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid user id' });
        return;
    }

    try {
        const referencedPost = await Post.exists({ author: req.params.id });
        if (referencedPost) {
            res.status(409).json({ error: 'User has posts' });
            return;
        }

        const result = await User.findByIdAndDelete(req.params.id);
        if (!result) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.login = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }

    const fields = validate(['username', 'password'], req.body);
    if (fields.length) {
        res.status(400).json({ error: 'Missing fields', fields });
        return;
    }

    try {
        const user = await User.findOne({ username: req.body.username }).select('+hash +salt');
        if (!user || !(await user.validPassword(req.body.password))) {
            res.status(401).json({ error: 'Invalid access' });
            return;
        }

        res.status(200).json(user.toAuthJSON());
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
