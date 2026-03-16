const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.get('/notifications', auth, notificationController.getMyNotifications);
router.get('/notifications/unread-count', auth, notificationController.getUnreadCount);
router.put('/notifications/:id/read', auth, notificationController.markAsRead);
router.put('/notifications/read-all', auth, notificationController.markAllAsRead);

module.exports = router;
