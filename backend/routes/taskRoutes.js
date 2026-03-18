const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const taskController = require('../controllers/taskController');

router.get('/tasks/my/count', auth, taskController.getMyTaskCount);
router.get('/tasks/my', auth, taskController.getMyTasks);
router.post('/tasks/:id/approve', auth, taskController.approveTask);
router.post('/tasks/:id/reject', auth, taskController.rejectTask);
router.post('/tasks/:id/start', auth, taskController.startTask);
router.post('/tasks/:id/complete', auth, taskController.completeTask);

module.exports = router;
