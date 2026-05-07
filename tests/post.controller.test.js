const test = require('node:test');
const { assert, assertJsonCall, createQuery, createRes } = require('./test-helpers');
const Category = require('../models/category.model');
const Post = require('../models/post.model');
const User = require('../models/user.model');
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

test('getPosts falls back on partial numbers and caps large page offsets', async (t) => {
    const query = createQuery([]);
    t.mock.method(Post, 'find', () => query);
    const req = { query: { limit: '10abc', page: '5000' } };
    const res = createRes();

    await postController.getPosts(req, res);

    assert.deepEqual(query.skipCalls, [19980]);
    assert.deepEqual(query.limitCalls, [20]);
    assertJsonCall(res, []);
});

test('categoryPosts queries by req.params.category with default pagination', async (t) => {
    const query = createQuery([{ _id: '1' }]);
    const find = t.mock.method(Post, 'find', () => query);
    const categoryExists = t.mock.method(Category, 'exists', async () => {
        throw new Error('archived category reads should not check active category state');
    });
    const req = { params: { category: '507f1f77bcf86cd799439011' }, query: {} };
    const res = createRes();

    await postController.categoryPosts(req, res);

    assert.equal(categoryExists.mock.calls.length, 0);
    assert.deepEqual(find.mock.calls[0].arguments, [{ category: '507f1f77bcf86cd799439011' }]);
    assert.deepEqual(query.skipCalls, [0]);
    assert.deepEqual(query.limitCalls, [20]);
    assert.equal(query.leanCalls, 1);
    assertJsonCall(res, [{ _id: '1' }]);
    assert.deepEqual(res.statusCalls, []);
});

test('categoryPosts rejects invalid category ids before querying', async (t) => {
    const find = t.mock.method(Post, 'find', () => {
        throw new Error('should not query with invalid id');
    });
    const req = { params: { category: 'not-an-id' }, query: {} };
    const res = createRes();

    await postController.categoryPosts(req, res);

    assert.equal(find.mock.calls.length, 0);
    assert.deepEqual(res.statusCalls, [400]);
    assertJsonCall(res, { error: 'Invalid category id' });
});

test('createPost uses the authenticated user as author and verifies references', async (t) => {
    const userExists = t.mock.method(User, 'exists', async () => ({ _id: '507f1f77bcf86cd799439011' }));
    const categoryExists = t.mock.method(Category, 'exists', async () => ({ _id: '507f1f77bcf86cd799439013' }));
    let savedPost;
    t.mock.method(Post.prototype, 'save', async function () {
        savedPost = this;
        return this;
    });
    const req = {
        body: {
            title: 'First',
            body: 'Post body',
            category: '507f1f77bcf86cd799439013',
            author: '507f1f77bcf86cd799439012',
            ignored: 'not saved'
        },
        user: { id: '507f1f77bcf86cd799439011' }
    };
    const res = createRes();

    await postController.createPost(req, res);

    assert.deepEqual(userExists.mock.calls[0].arguments, [{ _id: '507f1f77bcf86cd799439011', deletedAt: null }]);
    assert.deepEqual(categoryExists.mock.calls[0].arguments, [{ _id: '507f1f77bcf86cd799439013', deletedAt: null }]);
    assert.equal(savedPost.author.toString(), '507f1f77bcf86cd799439011');
    assert.equal(savedPost.category.toString(), '507f1f77bcf86cd799439013');
    assert.equal(savedPost.ignored, undefined);
    assertJsonCall(res, savedPost);
});

test('createPost checks author and category references in parallel', async (t) => {
    let userStarted = false;
    let categorySawUserStarted = false;
    t.mock.method(User, 'exists', async () => {
        userStarted = true;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { _id: '507f1f77bcf86cd799439011' };
    });
    t.mock.method(Category, 'exists', async () => {
        categorySawUserStarted = userStarted;
        return { _id: '507f1f77bcf86cd799439013' };
    });
    t.mock.method(Post.prototype, 'save', async function () {
        return this;
    });
    const req = {
        body: {
            title: 'First',
            body: 'Post body',
            category: '507f1f77bcf86cd799439013'
        },
        user: { id: '507f1f77bcf86cd799439011' }
    };
    const res = createRes();

    await postController.createPost(req, res);

    assert.equal(categorySawUserStarted, true);
});

test('createPost rejects a missing category reference before saving', async (t) => {
    t.mock.method(User, 'exists', async () => ({ _id: '507f1f77bcf86cd799439011' }));
    t.mock.method(Category, 'exists', async () => null);
    const save = t.mock.method(Post.prototype, 'save', async () => {
        throw new Error('should not save a post with a missing category');
    });
    const req = {
        body: {
            title: 'First',
            body: 'Post body',
            category: '507f1f77bcf86cd799439013'
        },
        user: { id: '507f1f77bcf86cd799439011' }
    };
    const res = createRes();

    await postController.createPost(req, res);

    assert.equal(save.mock.calls.length, 0);
    assert.deepEqual(res.statusCalls, [400]);
    assertJsonCall(res, { error: 'Category not found' });
});

test('updatePost rejects edits from a user who does not own the post', async (t) => {
    const update = t.mock.method(Post, 'findOneAndUpdate', async () => null);
    t.mock.method(Post, 'exists', async () => ({ _id: '507f1f77bcf86cd799439014' }));
    const req = {
        params: { id: '507f1f77bcf86cd799439014' },
        body: { title: 'Changed' },
        user: { id: '507f1f77bcf86cd799439011' }
    };
    const res = createRes();

    await postController.updatePost(req, res);

    assert.deepEqual(update.mock.calls[0].arguments[0], {
        _id: '507f1f77bcf86cd799439014',
        author: '507f1f77bcf86cd799439011'
    });
    assert.deepEqual(res.statusCalls, [403]);
    assertJsonCall(res, { error: 'Cannot update another user post' });
});

test('updatePost only sets allowed fields', async (t) => {
    const result = { _id: '507f1f77bcf86cd799439014', title: 'Changed' };
    const update = t.mock.method(Post, 'findOneAndUpdate', async () => result);
    const req = {
        params: { id: '507f1f77bcf86cd799439014' },
        body: {
            title: 'Changed',
            author: '507f1f77bcf86cd799439012',
            ignored: 'not saved'
        },
        user: { id: '507f1f77bcf86cd799439011' }
    };
    const res = createRes();

    await postController.updatePost(req, res);

    assert.deepEqual(update.mock.calls[0].arguments, [
        { _id: '507f1f77bcf86cd799439014', author: '507f1f77bcf86cd799439011' },
        { $set: { title: 'Changed' } },
        { new: true, runValidators: true }
    ]);
    assertJsonCall(res, result);
});

test('updatePost rejects a missing replacement category', async (t) => {
    const ownsPost = t.mock.method(Post, 'exists', async () => {
        throw new Error('should not pre-read post ownership before updating');
    });
    t.mock.method(Category, 'exists', async () => null);
    const update = t.mock.method(Post, 'findOneAndUpdate', async () => {
        throw new Error('should not update to a missing category');
    });
    const req = {
        params: { id: '507f1f77bcf86cd799439014' },
        body: { category: '507f1f77bcf86cd799439013' },
        user: { id: '507f1f77bcf86cd799439011' }
    };
    const res = createRes();

    await postController.updatePost(req, res);

    assert.equal(ownsPost.mock.calls.length, 0);
    assert.equal(update.mock.calls.length, 0);
    assert.deepEqual(res.statusCalls, [400]);
    assertJsonCall(res, { error: 'Category not found' });
});

test('deletePost rejects deletes from a user who does not own the post', async (t) => {
    const deletePost = t.mock.method(Post, 'findOneAndDelete', async () => null);
    t.mock.method(Post, 'exists', async () => ({ _id: '507f1f77bcf86cd799439014' }));
    const req = {
        params: { id: '507f1f77bcf86cd799439014' },
        user: { id: '507f1f77bcf86cd799439011' }
    };
    const res = createRes();

    await postController.deletePost(req, res);

    assert.deepEqual(deletePost.mock.calls[0].arguments, [
        { _id: '507f1f77bcf86cd799439014', author: '507f1f77bcf86cd799439011' }
    ]);
    assert.deepEqual(res.statusCalls, [403]);
    assertJsonCall(res, { error: 'Cannot delete another user post' });
});

test('getPosts returns 500 for unexpected errors', async (t) => {
    t.mock.method(Post, 'find', () => {
        throw new Error('database unavailable');
    });
    t.mock.method(console, 'error', () => {});
    const req = { query: {} };
    const res = createRes();

    await postController.getPosts(req, res);

    assert.deepEqual(res.statusCalls, [500]);
    assertJsonCall(res, { error: 'Internal server error' });
});
