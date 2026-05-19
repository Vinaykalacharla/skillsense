const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getInterviewSession,
  handleInterviewAction,
} = require('../controllers/aiInterviewController');

const router = express.Router();

router.get('/ai-interview/', protect, getInterviewSession);
router.post('/ai-interview/action/', protect, express.json(), handleInterviewAction);

module.exports = router;
