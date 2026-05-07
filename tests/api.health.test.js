const request = require('supertest');

describe('api health endpoint', () => {
    test('GET /health returns ok status', async () => {
        process.env.SKIP_DB_CONNECT = 'true';
        jest.resetModules();
        const api = require('../api');

        const response = await request(api).get('/health');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
    });
});
