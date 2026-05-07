const User = require('../models/user.model');
const mongoose = require('mongoose');
const Post = require('../models/post.model');
const { findPage } = require('./pagination');

exports.getUsers = async (req, res) => {
    try {
        // Users are returned without password hash fields because the model
        // excludes them from normal queries and JSON output.
        const result = await findPage(User.find({}), req.query);
        res.json(result);
    } catch (err) {
        res.status(400).json(err);
    }
};

exports.getUserById = async (req, res) => {
    // A valid-looking ObjectId is not the same as an existing user, so this
    // handler checks both cases and returns different status codes.
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

    // Basic controller validation keeps API errors readable for beginners.
    const fields = validate(['username', 'email', 'password'], req.body);
    if (fields.length) {
        res.status(400).json({ error: 'Missing fields', fields });
        return;
    }

    try {
        // Never pass a raw password into the User constructor. Hash it first,
        // then save only the generated hash and salt.
        const payload = { ...req.body };
        const pass = payload.password;
        delete payload.password;
        const user = new User(payload);
        await user.setPassword(pass);
        const result = await user.save();
        res.json(result);
    } catch (err) {
        if (handleDuplicateKeyError(err, res)) {
            return;
        }
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

        // Copy only fields this endpoint allows clients to change.
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
        if (handleDuplicateKeyError(err, res)) {
            return;
        }
        res.status(400).json(err);
    }
};

exports.deleteUser = async (req, res) => {
    if (typeof req.params.id !== 'string' || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid user id' });
        return;
    }

    try {
        // Reject the delete when posts still reference this user as author.
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
        // Hash and salt are hidden by default, so login explicitly selects them
        // for the password check.
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
    // Return a list of missing field names instead of only saying "bad request".
    return fields.filter((field) => {
        if (typeof body[field] === 'undefined') {
            return field;
        }
        return false;
    });
}

function handleDuplicateKeyError(err, res) {
    // MongoDB uses error code 11000 for unique-index conflicts.
    if (!err || err.code !== 11000) {
        return false;
    }

    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    res.status(400).json({ error: 'Duplicate fields', fields });
    return true;
}
