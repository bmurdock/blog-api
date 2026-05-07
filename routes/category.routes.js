const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { requireAuth } = require('../middleware/auth.middleware');


// Routes map an HTTP method and URL pattern to one controller function.
router.get('/', categoryController.getCategories);

// Creating, editing, and deleting categories changes data, so these routes
// require a valid JWT before the controller runs.
router.post('/', requireAuth, categoryController.createCategory);

router.put('/:id', requireAuth, categoryController.updateCategory);

router.delete('/:id', requireAuth, categoryController.deleteCategory);

module.exports = router;
