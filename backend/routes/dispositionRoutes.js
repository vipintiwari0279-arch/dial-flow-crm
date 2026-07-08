const express = require('express');
const router = express.Router();
const { getDispositions, addDisposition, deleteDisposition } = require('../controllers/dispositionController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getDispositions)
  .post(authorize('admin'), addDisposition);

router.route('/:id')
  .delete(authorize('admin'), deleteDisposition);

module.exports = router;
