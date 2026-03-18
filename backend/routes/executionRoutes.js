const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const executionController = require('../controllers/executionController');

router.post('/workflows/:workflow_id/execute', auth, executionController.executeWorkflow);
router.get('/executions', auth, executionController.getExecutions);
router.get('/executions/:id', auth, executionController.getExecution);
router.post('/executions/:id/cancel', auth, executionController.cancelExecution);
router.post('/executions/:id/retry', auth, executionController.retryExecution);

module.exports = router;
