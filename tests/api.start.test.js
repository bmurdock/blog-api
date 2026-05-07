const test = require('node:test');
const { assert, clearModules } = require('./test-helpers');

// This test uses mocks to check startup order without opening a real database
// connection or leaving a server running.
test('start waits for MongoDB before listening', async (t) => {
    process.env.SKIP_DB_CONNECT = 'true';
    const mongoose = require('mongoose');
    const connect = t.mock.method(mongoose, 'connect', async () => {});
    t.mock.method(mongoose.connection, 'on', () => mongoose.connection);
    t.mock.method(console, 'log', () => {});
    clearModules(['../api']);
    const api = require('../api');
    delete process.env.SKIP_DB_CONNECT;
    const server = { close: t.mock.fn() };
    const listen = t.mock.method(api, 'listen', (port, callback) => {
        callback();
        return server;
    });

    await api.start();

    assert.equal(connect.mock.calls.length, 1);
    assert.equal(listen.mock.calls.length, 1);
    assert.equal(listen.mock.calls[0].arguments[0], 3131);
    assert.equal(typeof listen.mock.calls[0].arguments[1], 'function');
});
