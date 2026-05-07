const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth.middleware');


// Put /login before /:id so Express does not treat "login" as a user id.
router.get('/', userController.getUsers);

router.post('/login', userController.login);

router.get('/:id', userController.getUserById);

// Anyone can create an account, but updates and deletes require a token.
router.post('/', userController.createUser);

router.put('/:id', requireAuth, userController.updateUser);

router.delete('/:id', requireAuth, userController.deleteUser);

module.exports = router;
