const test = require('node:test');
const { assert, assertJsonCall, createQuery, createRes } = require('./test-helpers');
const User = require('../models/user.model');
const Post = require('../models/post.model');
const userController = require('../controllers/user.controller');

// User controller tests cover common API concerns: pagination, login, and
// refusing deletes that would leave posts with missing authors.
test('getUsers applies bounded pagination and lean reads', async (t) => {
    const query = createQuery([{ username: 'alice' }]);
    const find = t.mock.method(User, 'find', () => query);
    const req = { query: {} };
    const res = createRes();

    await userController.getUsers(req, res);

    assert.deepEqual(find.mock.calls[0].arguments, [{}]);
    assert.deepEqual(query.sortCalls, [{ _id: -1 }]);
    assert.deepEqual(query.skipCalls, [0]);
    assert.deepEqual(query.limitCalls, [20]);
    assert.equal(query.leanCalls, 1);
    assertJsonCall(res, [{ username: 'alice' }]);
});

test('login explicitly selects password fields and awaits async password verification', async (t) => {
    const user = {
        validPassword: t.mock.fn(async () => true),
        toAuthJSON: t.mock.fn(() => ({ token: 'jwt' }))
    };
    const query = {
        select: t.mock.fn(async () => user)
    };
    const findOne = t.mock.method(User, 'findOne', () => query);
    const req = { body: { username: 'alice', password: 'secret' } };
    const res = createRes();

    await userController.login(req, res);

    assert.deepEqual(findOne.mock.calls[0].arguments, [{ username: 'alice' }]);
    assert.deepEqual(query.select.mock.calls[0].arguments, ['+hash +salt']);
    assert.deepEqual(user.validPassword.mock.calls[0].arguments, ['secret']);
    assert.deepEqual(res.statusCalls, [200]);
    assertJsonCall(res, { token: 'jwt' });
});

test('deleteUser rejects deletes while posts reference the user', async (t) => {
    const exists = t.mock.method(Post, 'exists', async () => ({ _id: 'post1' }));
    const deleteUser = t.mock.method(User, 'findByIdAndDelete', async () => null);
    const req = { params: { id: '507f1f77bcf86cd799439011' } };
    const res = createRes();

    await userController.deleteUser(req, res);

    assert.deepEqual(exists.mock.calls[0].arguments, [{ author: '507f1f77bcf86cd799439011' }]);
    assert.equal(deleteUser.mock.calls.length, 0);
    assert.deepEqual(res.statusCalls, [409]);
    assertJsonCall(res, { error: 'User has posts' });
});
