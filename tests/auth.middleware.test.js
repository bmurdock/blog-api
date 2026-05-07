const express = require('express');
const test = require('node:test');
const { assert, request } = require('./test-helpers');

process.env.JWT_SECRET = 'test-secret';
const User = require('../models/user.model');
const { requireAdmin, requireAuth } = require('../middleware/auth.middleware');

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

test('admin middleware rejects a signed-in user without the admin role', async (t) => {
    const app = express();
    app.post('/admin', requireAuth, requireAdmin, (req, res) => res.json({ ok: true }));
    t.mock.method(User, 'exists', async () => null);
    const user = new User({ _id: '507f1f77bcf86cd799439011', username: 'alice', email: 'alice@example.com' });
    const token = user.generateJWT();

    const response = await request(app, 'POST', '/admin', {
        headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.body, { error: 'Admin access required' });
});

test('admin middleware allows a user who is currently an admin in the database', async (t) => {
    const app = express();
    app.post('/admin', requireAuth, requireAdmin, (req, res) => res.json({ ok: true }));
    const exists = t.mock.method(User, 'exists', async () => ({ _id: '507f1f77bcf86cd799439011' }));
    const user = new User({
        _id: '507f1f77bcf86cd799439011',
        username: 'alice',
        email: 'alice@example.com'
    });
    const token = user.generateJWT();

    const response = await request(app, 'POST', '/admin', {
        headers: { authorization: `Bearer ${token}` }
    });

    assert.deepEqual(exists.mock.calls[0].arguments, [{
        _id: '507f1f77bcf86cd799439011',
        role: 'admin',
        deletedAt: null
    }]);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { ok: true });
});

test('admin middleware rejects a stale token after the user is no longer admin', async (t) => {
    const app = express();
    app.post('/admin', requireAuth, requireAdmin, (req, res) => res.json({ ok: true }));
    t.mock.method(User, 'exists', async () => null);
    const user = new User({
        _id: '507f1f77bcf86cd799439011',
        username: 'alice',
        email: 'alice@example.com',
        role: 'admin'
    });
    const token = user.generateJWT();

    const response = await request(app, 'POST', '/admin', {
        headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.body, { error: 'Admin access required' });
});

test('admin middleware returns 500 when the role check fails unexpectedly', async (t) => {
    const app = express();
    app.post('/admin', requireAuth, requireAdmin, (req, res) => res.json({ ok: true }));
    t.mock.method(User, 'exists', async () => {
        throw new Error('database unavailable');
    });
    t.mock.method(console, 'error', () => {});
    const user = new User({ _id: '507f1f77bcf86cd799439011', username: 'alice', email: 'alice@example.com' });
    const token = user.generateJWT();

    const response = await request(app, 'POST', '/admin', {
        headers: { authorization: `Bearer ${token}` }
    });

    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.body, { error: 'Internal server error' });
});
