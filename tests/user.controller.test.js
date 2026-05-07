const test = require('node:test');
const { assert, assertJsonCall, createQuery, createRes } = require('./test-helpers');
const User = require('../models/user.model');
const Post = require('../models/post.model');
const userController = require('../controllers/user.controller');

// User controller tests cover common API concerns: pagination, login, and
// soft deletes that preserve old post references.
test('getUsers applies bounded pagination and lean reads', async (t) => {
    const query = createQuery([{ username: 'alice' }]);
    const find = t.mock.method(User, 'find', () => query);
    const req = { query: {} };
    const res = createRes();

    await userController.getUsers(req, res);

    assert.deepEqual(find.mock.calls[0].arguments, [{ deletedAt: null }]);
    assert.deepEqual(query.selectCalls, ['username email bio image avatar createdAt updatedAt']);
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

    assert.deepEqual(findOne.mock.calls[0].arguments, [{ username: 'alice', deletedAt: null }]);
    assert.deepEqual(query.select.mock.calls[0].arguments, ['+hash +salt']);
    assert.deepEqual(user.validPassword.mock.calls[0].arguments, ['secret']);
    assert.deepEqual(res.statusCalls, [200]);
    assertJsonCall(res, { token: 'jwt' });
});

test('createUser rejects a null password before hashing', async (t) => {
    const setPassword = t.mock.method(User.prototype, 'setPassword', async () => {
        throw new Error('should not hash a missing password');
    });
    const req = { body: { username: 'alice', email: 'alice@example.com', password: null } };
    const res = createRes();

    await userController.createUser(req, res);

    assert.equal(setPassword.mock.calls.length, 0);
    assert.deepEqual(res.statusCalls, [400]);
    assertJsonCall(res, { error: 'Missing fields', fields: ['password'] });
});

test('deleteUser soft deletes without checking posts first', async (t) => {
    const exists = t.mock.method(Post, 'exists', async () => {
        throw new Error('soft delete should not check posts first');
    });
    const result = { _id: '507f1f77bcf86cd799439011', username: 'alice' };
    const deleteUser = t.mock.method(User, 'findOneAndUpdate', async () => result);
    const req = {
        params: { id: '507f1f77bcf86cd799439011' },
        user: { id: '507f1f77bcf86cd799439011' }
    };
    const res = createRes();

    await userController.deleteUser(req, res);

    assert.equal(exists.mock.calls.length, 0);
    assert.deepEqual(deleteUser.mock.calls[0].arguments[0], {
        _id: '507f1f77bcf86cd799439011',
        deletedAt: null
    });
    assert.ok(deleteUser.mock.calls[0].arguments[1].$set.deletedAt instanceof Date);
    assert.deepEqual(deleteUser.mock.calls[0].arguments[2], { new: true });
    assertJsonCall(res, result);
});

test('deleteUser preserves username and email so deleted identities stay reserved', async (t) => {
    const result = { _id: '507f1f77bcf86cd799439011', username: 'alice' };
    const deleteUser = t.mock.method(User, 'findOneAndUpdate', async () => result);
    const req = {
        params: { id: '507f1f77bcf86cd799439011' },
        user: { id: '507f1f77bcf86cd799439011' }
    };
    const res = createRes();

    await userController.deleteUser(req, res);

    assert.deepEqual(Object.keys(deleteUser.mock.calls[0].arguments[1].$set), ['deletedAt']);
    assert.equal(typeof deleteUser.mock.calls[0].arguments[1].$set.username, 'undefined');
    assert.equal(typeof deleteUser.mock.calls[0].arguments[1].$set.email, 'undefined');
});

test('updateUser rejects attempts to update a different user', async (t) => {
    const findById = t.mock.method(User, 'findById', async () => {
        throw new Error('should not look up another user');
    });
    const req = {
        params: { id: '507f1f77bcf86cd799439011' },
        body: { bio: 'new bio' },
        user: { id: '507f1f77bcf86cd799439012' }
    };
    const res = createRes();

    await userController.updateUser(req, res);

    assert.equal(findById.mock.calls.length, 0);
    assert.deepEqual(res.statusCalls, [403]);
    assertJsonCall(res, { error: 'Cannot update another user' });
});

test('deleteUser rejects attempts to delete a different user', async (t) => {
    const exists = t.mock.method(Post, 'exists', async () => {
        throw new Error('should not check posts for another user');
    });
    const req = {
        params: { id: '507f1f77bcf86cd799439011' },
        user: { id: '507f1f77bcf86cd799439012' }
    };
    const res = createRes();

    await userController.deleteUser(req, res);

    assert.equal(exists.mock.calls.length, 0);
    assert.deepEqual(res.statusCalls, [403]);
    assertJsonCall(res, { error: 'Cannot delete another user' });
});
