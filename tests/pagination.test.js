const test = require('node:test');
const { assert } = require('./test-helpers');
const { getPagination, MAX_PAGE } = require('../controllers/pagination');

test('pagination accepts only whole positive integers', () => {
    const result = getPagination({ page: '2abc', limit: '10abc' });

    assert.deepEqual(result, {
        limit: 20,
        skip: 0
    });
});

test('pagination caps large page numbers to keep skip bounded', () => {
    const result = getPagination({ page: String(MAX_PAGE + 1), limit: '100' });

    assert.deepEqual(result, {
        limit: 100,
        skip: (MAX_PAGE - 1) * 100
    });
});
