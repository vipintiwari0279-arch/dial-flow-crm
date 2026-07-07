const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadLeads, distributeLeads, getLeads, getNextAgentLead, getCallbacks } = require('../controllers/leadController');
const { protect, authorize } = require('../middleware/auth');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== '.csv') {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

router.use(protect);

router.post('/upload', authorize('admin'), upload.single('file'), uploadLeads);
router.post('/distribute', authorize('admin'), distributeLeads);
router.get('/', authorize('admin'), getLeads);
router.get('/next', getNextAgentLead);
router.get('/callbacks', getCallbacks);

module.exports = router;
