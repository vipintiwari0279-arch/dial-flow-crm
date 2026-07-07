const express = require('express');
const router = express.Router();
const { logCall, getCalls, getDncList, addToDnc } = require('../controllers/callController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/log', logCall);
router.get('/', authorize('admin'), getCalls);
router.route('/dnc')
  .get(getDncList)
  .post(addToDnc);

module.exports = router;
