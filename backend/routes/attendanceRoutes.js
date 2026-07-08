const express = require('express');
const router = express.Router();
const { punchIn, punchOut, getTodayStatus, getAllAttendance } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/punch-in', punchIn);
router.post('/punch-out', punchOut);
router.get('/today', getTodayStatus);
router.get('/', authorize('admin'), getAllAttendance);

module.exports = router;
