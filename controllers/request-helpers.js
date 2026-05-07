const mongoose = require('mongoose');

function validateRequired(fields, body) {
    // Return every omitted field so the client can fix the whole request at once.
    return fields.filter((field) => typeof body[field] === 'undefined');
}

function pickFields(body, allowedFields) {
    // Controllers should decide which fields the API accepts. That keeps future
    // schema fields from becoming writable just because they were added to MongoDB.
    const picked = {};
    for (const field of allowedFields) {
        if (typeof body[field] !== 'undefined') {
            picked[field] = body[field];
        }
    }
    return picked;
}

function isValidObjectId(value) {
    return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
}

function sameObjectId(left, right) {
    if (!left || !right) {
        return false;
    }
    return left.toString() === right.toString();
}

function sendControllerError(res, err) {
    // Bad client input should be a 400. Unexpected database/app failures should
    // be a 500 so operators can distinguish them from validation mistakes.
    if (err && (err.name === 'ValidationError' || err.name === 'CastError')) {
        res.status(400).json({ error: err.message });
        return;
    }

    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
}

module.exports = {
    isValidObjectId,
    pickFields,
    sameObjectId,
    sendControllerError,
    validateRequired
};
