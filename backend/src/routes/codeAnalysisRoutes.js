const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  listCodeAnalyses,
  createCodeAnalysis,
  getCodeAnalysisFilePreview,
} = require('../controllers/codeAnalysisController');

const router = express.Router();

router.get('/code-analysis/', protect, listCodeAnalyses);
router.post('/code-analysis/', protect, express.json(), createCodeAnalysis);
router.get('/code-analysis/:reportId/file/', protect, getCodeAnalysisFilePreview);

module.exports = router;
