const test = require('node:test');
const { assert } = require('./test-helpers');

process.env.JWT_SECRET = 'test-secret';
const User = require('../models/user.model');

// Model tests check behavior on a Mongoose document without saving to MongoDB.
test('toJSON omits password hash and salt', async () => {
    const user = new User({ username: 'alice', email: 'alice@example.com' });

    await user.setPassword('secret');
    const json = user.toJSON();

    assert.ok(user.hash);
    assert.ok(user.salt);
    assert.equal(json.hash, undefined);
    assert.equal(json.salt, undefined);
});

test('password verification is asynchronous', async () => {
    const user = new User({ username: 'alice', email: 'alice@example.com' });

    await user.setPassword('secret');

    assert.equal(await user.validPassword('secret'), true);
    assert.equal(await user.validPassword('wrong'), false);
});
