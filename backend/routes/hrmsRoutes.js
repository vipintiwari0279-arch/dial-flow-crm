const express = require('express');
const router = express.Router();
const { applyLeave, getLeaves, updateLeaveStatus, updateAgentDocuments } = require('../controllers/hrmsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/leave', applyLeave);
router.get('/leave', getLeaves);

router.put('/leave/:id/status', authorize('admin'), updateLeaveStatus);
router.put('/agent/:id/documents', authorize('admin'), updateAgentDocuments);

module.exports = router;
