const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// Public read routes.
router.get('/', postController.getPosts);

router.get('/category/:category', postController.categoryPosts);

// Write routes use middleware first, then the controller.
router.post('/', requireAuth, postController.createPost);

router.put('/:id', requireAuth, postController.updatePost);

router.delete('/:id', requireAuth, postController.deletePost);

module.exports = router;
