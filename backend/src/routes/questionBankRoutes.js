const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  listQuestions,
  markQuestion,
  getFollowups,
  getDailyChallenge,
  getQuestionStats,
} = require('../controllers/questionBankController');

const router = express.Router();

router.get('/questions/',                  protect, listQuestions);
router.get('/questions/daily/',            protect, getDailyChallenge);
router.get('/questions/stats/',            protect, getQuestionStats);
router.post('/questions/:id/mark/',        protect, markQuestion);
router.get('/questions/:id/followups/',    protect, getFollowups);

module.exports = router;
