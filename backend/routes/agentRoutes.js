const express = require('express');
const router = express.Router();
const { getAgents, createAgent, updateAgent, deleteAgent, setTarget } = require('../controllers/agentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin')); // All agent endpoints in this file are admin-only

router.route('/')
  .get(getAgents)
  .post(createAgent);

router.route('/:id')
  .put(updateAgent)
  .delete(deleteAgent);

router.post('/:id/target', setTarget);

module.exports = router;
