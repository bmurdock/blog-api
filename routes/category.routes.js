const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { requireAdmin, requireAuth } = require('../middleware/auth.middleware');


// Routes map an HTTP method and URL pattern to one controller function.
router.get('/', categoryController.getCategories);

// Categories are shared by the whole blog, so changing them requires both a
// valid JWT and the current admin role in MongoDB.
router.post('/', requireAuth, requireAdmin, categoryController.createCategory);

router.put('/:id', requireAuth, requireAdmin, categoryController.updateCategory);

router.delete('/:id', requireAuth, requireAdmin, categoryController.deleteCategory);

module.exports = router;
