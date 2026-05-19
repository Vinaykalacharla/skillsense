const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  getDashboardSkills,
  getActivities,
  getNotifications,
  markNotificationsRead,
  getInterviewSchedules,
  getVerificationSteps,
  getPerformanceSeries,
  listMedia,
  uploadMedia,
  getRoadmap,
  getSkillPassport,
  downloadSkillPassportPdf,
  downloadResume,
  getResumeBuilder,
  downloadResumeBuilderPdf,
  getRecommendations,
} = require('../controllers/skillsController');

const storage = multer.diskStorage({
  destination: path.join('uploads', 'media'),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-z0-9\.\-_]/gi, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });
const router = express.Router();

router.get('/dashboard/', protect, getDashboardSkills);
router.get('/activities/', protect, getActivities);
router.get('/notifications/', protect, getNotifications);
router.post('/notifications/:id/read/', protect, markNotificationsRead);
router.get('/interview-schedules/', protect, getInterviewSchedules);
router.get('/verification-steps/', protect, getVerificationSteps);
router.get('/performance/', protect, getPerformanceSeries);
router.get('/media/', protect, listMedia);
router.post('/media/', protect, upload.single('file'), uploadMedia);
router.get('/roadmap/', protect, getRoadmap);
router.get('/skill-passport/', protect, getSkillPassport);
router.get('/skill-passport/pdf/', protect, downloadSkillPassportPdf);
router.get('/resume/', protect, downloadResume);
router.get('/resume-builder/', protect, getResumeBuilder);
router.get('/resume-builder/pdf/', protect, downloadResumeBuilderPdf);
router.get('/recommendations/', protect, getRecommendations);

module.exports = router;
