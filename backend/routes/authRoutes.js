const express = require('express');
const router = express.Router();
const { login, getMe, updateStatus, debugDb } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.get('/debug', debugDb);
router.get('/me', protect, getMe);
router.put('/status', protect, updateStatus);

module.exports = router;
