const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('auth middleware', () => {
    let requireAuth;

    beforeEach(() => {
        jest.resetModules();
        process.env.JWT_SECRET = 'test-secret';
        requireAuth = require('../middleware/auth.middleware').requireAuth;
    });

    test('rejects requests without a bearer token', async () => {
        const app = express();
        app.post('/protected', requireAuth, (req, res) => res.json({ ok: true }));

        const response = await request(app).post('/protected');

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ error: 'Authentication required' });
    });

    test('allows requests with a valid bearer token', async () => {
        const app = express();
        app.post('/protected', requireAuth, (req, res) => res.json({ user: req.user.username }));
        const token = jwt.sign({ id: 'u1', username: 'alice' }, 'test-secret');

        const response = await request(app)
            .post('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ user: 'alice' });
    });
});
