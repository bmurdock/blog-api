const User = require('../models/user.model');

function getBearerToken(header) {
    // Protected routes expect the standard Authorization header:
    // Authorization: Bearer <token>
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
        // Store the decoded token payload on the request so later handlers can
        // read information about the authenticated user.
        req.user = User.verifyJWT(token);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = {
    requireAuth
};
