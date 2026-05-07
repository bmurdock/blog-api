const test = require('node:test');
const { assert, clearModules, request } = require('./test-helpers');

// This is a small route-level test: it makes a real HTTP request to Express,
// but skips MongoDB because /health does not need the database.
test('GET /health returns ok status', async () => {
    process.env.SKIP_DB_CONNECT = 'true';
    clearModules(['../api']);
    const api = require('../api');

    const response = await request(api, 'GET', '/health');

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { status: 'ok' });
});
