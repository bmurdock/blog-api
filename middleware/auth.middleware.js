const User = require('../models/user.model');

function getBearerToken(header) {
    if (typeof header !== 'string') {
        return null;
    }

    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}

function requireAuth(req, res, next) {
    const token = getBearerToken(req.get('authorization'));
    if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    try {
        req.user = User.verifyJWT(token);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = {
    requireAuth
};
