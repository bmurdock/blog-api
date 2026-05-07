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

async function requireAdmin(req, res, next) {
    // Categories are shared by the whole blog. The JWT proves which user is
    // making the request; the database stays the source of truth for roles.
    try {
        const isAdmin = req.user && await User.exists({
            _id: req.user.id,
            role: 'admin',
            deletedAt: null
        });
        if (!isAdmin) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }

        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    requireAdmin,
    requireAuth
};
