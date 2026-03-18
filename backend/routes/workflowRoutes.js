const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const workflowController = require('../controllers/workflowController');

router.post('/', auth, workflowController.createWorkflow);
router.post('/financial', auth, workflowController.createFinancialWorkflow);
router.get('/', auth, workflowController.getWorkflows);
router.get('/:id', auth, workflowController.getWorkflow);
router.put('/:id', auth, workflowController.updateWorkflow);
router.delete('/:id', auth, workflowController.deleteWorkflow);

module.exports = router;
