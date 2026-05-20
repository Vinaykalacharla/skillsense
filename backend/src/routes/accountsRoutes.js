const express = require('express');
const multer = require('multer');
const {
  signup,
  login,
  dashboard,
  recalculate,
  scoreReport,
  getProfile,
  updateProfile,
  syncFromResume,
  checkAts,
  getAtsReport,
  logout,
} = require('../controllers/accountsController');
const { protect } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: 'uploads/resumes',
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-z0-9\.\-_]/gi, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });
const router = express.Router();

router.post('/signup/', upload.single('resume'), signup);
router.post('/login/', express.json(), login);
router.post('/logout/', protect, logout);
router.get('/dashboard/', protect, dashboard);
router.post('/recalculate/', protect, recalculate);
router.post('/sync-from-resume/', protect, syncFromResume);
router.get('/score-report/', protect, scoreReport);
router.get('/profile/', protect, getProfile);
router.patch('/profile/update/', protect, express.json(), updateProfile);

// ATS Score Checker routes
router.post('/ats-check/', protect, upload.single('resume'), checkAts);
router.get('/ats-report/', protect, getAtsReport);

module.exports = router;
