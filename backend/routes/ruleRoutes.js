const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ruleController = require('../controllers/ruleController');

router.post('/steps/:step_id/rules', auth, ruleController.createRule);
router.get('/steps/:step_id/rules', auth, ruleController.getRules);
router.put('/rules/:id', auth, ruleController.updateRule);
router.delete('/rules/:id', auth, ruleController.deleteRule);

module.exports = router;
