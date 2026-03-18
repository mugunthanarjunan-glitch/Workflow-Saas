const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/create-user', auth, rbac('admin'), authController.createUser);
router.get('/users', auth, authController.getUsers);
router.delete('/users/:id', auth, rbac('admin'), authController.deleteUser);
router.get('/me', auth, authController.getMe);

module.exports = router;
