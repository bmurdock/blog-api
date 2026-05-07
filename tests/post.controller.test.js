const test = require('node:test');
const { assert, assertJsonCall, createQuery, createRes } = require('./test-helpers');
const Post = require('../models/post.model');
const postController = require('../controllers/post.controller');

// These tests show how to verify controller behavior without making real
// database queries.
test('getPosts applies bounded pagination and lean reads', async (t) => {
    const query = createQuery([{ _id: '1' }]);
    const find = t.mock.method(Post, 'find', () => query);
    const req = { query: { limit: '500', page: '2' } };
    const res = createRes();

    await postController.getPosts(req, res);

    assert.deepEqual(find.mock.calls[0].arguments, [{}]);
    assert.deepEqual(query.sortCalls, [{ _id: -1 }]);
    assert.deepEqual(query.skipCalls, [100]);
    assert.deepEqual(query.limitCalls, [100]);
    assert.equal(query.leanCalls, 1);
    assertJsonCall(res, [{ _id: '1' }]);
});

test('categoryPosts queries by req.params.category with default pagination', async (t) => {
    const query = createQuery([{ _id: '1' }]);
    const find = t.mock.method(Post, 'find', () => query);
    const req = { params: { category: 'abc123' }, query: {} };
    const res = createRes();

    await postController.categoryPosts(req, res);

    assert.deepEqual(find.mock.calls[0].arguments, [{ category: 'abc123' }]);
    assert.deepEqual(query.skipCalls, [0]);
    assert.deepEqual(query.limitCalls, [20]);
    assert.equal(query.leanCalls, 1);
    assertJsonCall(res, [{ _id: '1' }]);
    assert.deepEqual(res.statusCalls, []);
});
