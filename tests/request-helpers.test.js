const test = require('node:test');
const { assert } = require('./test-helpers');
const { validateRequired } = require('../controllers/request-helpers');

test('validateRequired rejects missing null and blank string fields', () => {
    const fields = validateRequired(['title', 'body', 'category', 'author'], {
        title: null,
        body: '   ',
        category: '507f1f77bcf86cd799439011',
        author: 123
    });

    assert.deepEqual(fields, ['title', 'body', 'author']);
});
