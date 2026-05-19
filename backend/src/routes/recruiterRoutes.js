const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getRecruiterDashboard,
  createRecruiterJob,
  updateCandidatePipeline,
  createSavedSearch,
  downloadCandidateReport,
  downloadCandidateResume,
  analyzeCandidateMatch,
} = require('../controllers/recruiterController');

const router = express.Router();

router.get('/recruiter-dashboard/', protect, getRecruiterDashboard);
router.get('/recruiter-dashboard/report/:studentId/', protect, downloadCandidateReport);
router.post('/recruiter-dashboard/jobs/', protect, express.json(), createRecruiterJob);
router.post('/recruiter-dashboard/pipeline/:studentId/', protect, express.json(), updateCandidatePipeline);
router.post('/recruiter-dashboard/saved-searches/', protect, express.json(), createSavedSearch);
router.get('/recruiter-dashboard/resume/:studentId/', protect, downloadCandidateResume);
router.post('/recruiter-dashboard/candidates/:studentId/analyze-match', protect, express.json(), analyzeCandidateMatch);

module.exports = router;
