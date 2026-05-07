const test = require('node:test');
const { assert, assertJsonCall, createRes, duplicateKeyError } = require('./test-helpers');
const User = require('../models/user.model');
const userController = require('../controllers/user.controller');

// Unique indexes are enforced by MongoDB, so these tests simulate the database
// error and check that the API turns it into a clear response.
test('createUser maps duplicate email errors to an explicit field response', async (t) => {
    t.mock.method(User.prototype, 'save', async () => {
        throw duplicateKeyError(['email']);
    });
    const req = { body: { username: 'alice', email: 'alice@example.com', password: 'secret' } };
    const res = createRes();

    await userController.createUser(req, res);

    assert.deepEqual(res.statusCalls, [400]);
    assertJsonCall(res, { error: 'Duplicate fields', fields: ['email'] });
});

test('updateUser maps duplicate username errors to an explicit field response', async (t) => {
    const user = new User({ username: 'alice', email: 'alice@example.com' });
    user.save = t.mock.fn(async () => {
        throw duplicateKeyError(['username']);
    });
    t.mock.method(User, 'findOne', async () => user);
    const req = {
        params: { id: '507f1f77bcf86cd799439011' },
        body: { username: 'alice' },
        user: { id: '507f1f77bcf86cd799439011' }
    };
    const res = createRes();

    await userController.updateUser(req, res);

    assert.deepEqual(res.statusCalls, [400]);
    assertJsonCall(res, { error: 'Duplicate fields', fields: ['username'] });
});
