const express = require('express');
const test = require('node:test');
const { assert, request } = require('./test-helpers');

process.env.JWT_SECRET = 'test-secret';
const User = require('../models/user.model');
const { requireAuth } = require('../middleware/auth.middleware');

// Middleware tests mount a tiny route so the test can focus only on auth.
test('auth middleware rejects requests without a bearer token', async () => {
    const app = express();
    app.post('/protected', requireAuth, (req, res) => res.json({ ok: true }));

    const response = await request(app, 'POST', '/protected');

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.body, { error: 'Authentication required' });
});

test('auth middleware allows requests with a valid bearer token', async () => {
    const app = express();
    app.post('/protected', requireAuth, (req, res) => res.json({ user: req.user.username }));
    const user = new User({ _id: '507f1f77bcf86cd799439011', username: 'alice', email: 'alice@example.com' });
    const token = user.generateJWT();

    const response = await request(app, 'POST', '/protected', {
        headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { user: 'alice' });
});
