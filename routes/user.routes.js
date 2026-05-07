const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth.middleware');


router.get('/', userController.getUsers);

router.post('/login', userController.login);

router.get('/:id', userController.getUserById);

router.post('/', userController.createUser);

router.put('/:id', requireAuth, userController.updateUser);

router.delete('/:id', requireAuth, userController.deleteUser);

module.exports = router;
