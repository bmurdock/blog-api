const test = require('node:test');
const { assert, assertJsonCall, createQuery, createRes } = require('./test-helpers');
const Category = require('../models/category.model');
const Post = require('../models/post.model');
const categoryController = require('../controllers/category.controller');

// Controller tests call handlers directly with fake req/res objects and mocked
// model methods, so they do not need a running Express server or MongoDB.
test('getCategories applies bounded pagination and lean reads', async (t) => {
    const query = createQuery([{ name: 'tech' }]);
    const find = t.mock.method(Category, 'find', () => query);
    const req = { query: {} };
    const res = createRes();

    await categoryController.getCategories(req, res);

    assert.deepEqual(find.mock.calls[0].arguments, [{ deletedAt: null }]);
    assert.deepEqual(query.sortCalls, [{ _id: -1 }]);
    assert.deepEqual(query.skipCalls, [0]);
    assert.deepEqual(query.limitCalls, [20]);
    assert.equal(query.leanCalls, 1);
    assertJsonCall(res, [{ name: 'tech' }]);
});

test('deleteCategory soft deletes without checking posts first', async (t) => {
    const exists = t.mock.method(Post, 'exists', async () => {
        throw new Error('soft delete should not check posts first');
    });
    const result = { _id: '507f1f77bcf86cd799439011', name: 'Tech' };
    const deleteCategory = t.mock.method(Category, 'findOneAndUpdate', async () => result);
    const req = { params: { id: '507f1f77bcf86cd799439011' } };
    const res = createRes();

    await categoryController.deleteCategory(req, res);

    assert.equal(exists.mock.calls.length, 0);
    assert.deepEqual(deleteCategory.mock.calls[0].arguments[0], {
        _id: '507f1f77bcf86cd799439011',
        deletedAt: null
    });
    assert.ok(deleteCategory.mock.calls[0].arguments[1].$set.deletedAt instanceof Date);
    assert.deepEqual(deleteCategory.mock.calls[0].arguments[2], { new: true });
    assertJsonCall(res, result);
});

test('createCategory only saves allowed fields', async (t) => {
    let savedCategory;
    t.mock.method(Category.prototype, 'save', async function () {
        savedCategory = this;
        return this;
    });
    const req = {
        body: {
            name: 'Tech',
            icon: 'code',
            owner: '507f1f77bcf86cd799439012',
            ignored: 'not saved'
        }
    };
    const res = createRes();

    await categoryController.createCategory(req, res);

    assert.equal(savedCategory.name, 'Tech');
    assert.equal(savedCategory.icon, 'code');
    assert.equal(savedCategory.owner, undefined);
    assert.equal(savedCategory.ignored, undefined);
    assertJsonCall(res, savedCategory);
});

test('updateCategory only sets allowed fields', async (t) => {
    const result = { _id: '507f1f77bcf86cd799439011', name: 'Tech' };
    const update = t.mock.method(Category, 'findOneAndUpdate', async () => result);
    const req = {
        params: { id: '507f1f77bcf86cd799439011' },
        body: {
            name: 'Tech',
            owner: '507f1f77bcf86cd799439012',
            ignored: 'not saved'
        }
    };
    const res = createRes();

    await categoryController.updateCategory(req, res);

    assert.deepEqual(update.mock.calls[0].arguments, [
        { _id: '507f1f77bcf86cd799439011', deletedAt: null },
        { $set: { name: 'Tech' } },
        { new: true, runValidators: true }
    ]);
    assertJsonCall(res, result);
});
