const User = require('../models/user.model');
const { findPage } = require('./pagination');
const {
    isValidObjectId,
    pickFields,
    sameObjectId,
    sendControllerError,
    validateRequired
} = require('./request-helpers');

const PUBLIC_USER_FIELDS = 'username email bio image avatar createdAt updatedAt';

exports.getUsers = async (req, res) => {
    try {
        // Users are returned without password hash fields because the model
        // excludes them from normal queries and JSON output.
        const result = await findPage(User.find({ deletedAt: null }).select(PUBLIC_USER_FIELDS), req.query);
        res.json(result);
    } catch (err) {
        sendControllerError(res, err);
    }
};

exports.getUserById = async (req, res) => {
    // A valid-looking ObjectId is not the same as an existing user, so this
    // handler checks both cases and returns different status codes.
    if (!isValidObjectId(req.params.id)) {
        res.status(400).json({ error: 'Invalid user id' });
        return;
    }

    try {
        const result = await User.findOne({ _id: req.params.id, deletedAt: null }).select(PUBLIC_USER_FIELDS);
        if (!result) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(result);
    } catch (err) {
        sendControllerError(res, err);
    }
};

exports.createUser = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }

    // Basic controller validation keeps API errors readable for beginners.
    const fields = validateRequired(['username', 'email', 'password'], req.body);
    if (fields.length) {
        res.status(400).json({ error: 'Missing fields', fields });
        return;
    }

    try {
        // Never pass a raw password into the User constructor. Hash it first,
        // then save only the generated hash and salt.
        const payload = pickFields(req.body, ['username', 'email', 'bio', 'image', 'avatar']);
        const pass = req.body.password;
        const user = new User(payload);
        await user.setPassword(pass);
        const result = await user.save();
        res.json(result);
    } catch (err) {
        if (handleDuplicateKeyError(err, res)) {
            return;
        }
        sendControllerError(res, err);
    }
};

exports.updateUser = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }
    if (!isValidObjectId(req.params.id)) {
        res.status(400).json({ error: 'Invalid user id' });
        return;
    }
    if (!sameObjectId(req.user && req.user.id, req.params.id)) {
        res.status(403).json({ error: 'Cannot update another user' });
        return;
    }

    try {
        const user = await User.findOne({ _id: req.params.id, deletedAt: null });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Copy only fields this endpoint allows clients to change.
        const allowedFields = ['username', 'email', 'bio', 'image', 'avatar'];
        const updates = pickFields(req.body, allowedFields);
        for (const field of Object.keys(updates)) {
            user[field] = updates[field];
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
        sendControllerError(res, err);
    }
};

exports.deleteUser = async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        res.status(400).json({ error: 'Invalid user id' });
        return;
    }
    if (!sameObjectId(req.user && req.user.id, req.params.id)) {
        res.status(403).json({ error: 'Cannot delete another user' });
        return;
    }

    try {
        // Soft delete the user instead of removing the document. Existing posts
        // can keep their author reference, while normal user reads hide the user.
        const result = await User.findOneAndUpdate(
            { _id: req.params.id, deletedAt: null },
            { $set: { deletedAt: new Date() } },
            { new: true }
        );
        if (!result) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(result);
    } catch (err) {
        sendControllerError(res, err);
    }
};

exports.login = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }

    const fields = validateRequired(['username', 'password'], req.body);
    if (fields.length) {
        res.status(400).json({ error: 'Missing fields', fields });
        return;
    }

    try {
        // Hash and salt are hidden by default, so login explicitly selects them
        // for the password check.
        const user = await User.findOne({ username: req.body.username, deletedAt: null }).select('+hash +salt');
        if (!user || !(await user.validPassword(req.body.password))) {
            res.status(401).json({ error: 'Invalid access' });
            return;
        }

        res.status(200).json(user.toAuthJSON());
    } catch (err) {
        sendControllerError(res, err);
    }
};

function handleDuplicateKeyError(err, res) {
    // MongoDB uses error code 11000 for unique-index conflicts.
    if (!err || err.code !== 11000) {
        return false;
    }

    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    res.status(400).json({ error: 'Duplicate fields', fields });
    return true;
}
