const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const stepController = require('../controllers/stepController');

router.post('/workflows/:workflow_id/steps', auth, stepController.createStep);
router.get('/workflows/:workflow_id/steps', auth, stepController.getSteps);
router.put('/steps/:id', auth, stepController.updateStep);
router.delete('/steps/:id', auth, stepController.deleteStep);

module.exports = router;
