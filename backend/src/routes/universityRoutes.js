const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  getUniversityDashboard,
  handleBatchUpload,
  updateUniversityIntervention,
  createPlacementDrive,
} = require('../controllers/universityController');

const storage = multer.diskStorage({
  destination: path.join('uploads', 'batches'),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-z0-9\.\-_]/gi, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });
const router = express.Router();

router.get('/university-dashboard/', protect, getUniversityDashboard);
router.post('/university-dashboard/batch-upload/', protect, upload.single('file'), handleBatchUpload);
router.post('/university-dashboard/interventions/:studentId/', protect, express.json(), updateUniversityIntervention);
router.post('/university-dashboard/drives/', protect, express.json(), createPlacementDrive);

module.exports = router;
