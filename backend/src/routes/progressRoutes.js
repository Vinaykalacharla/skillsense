const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getProgress, simulatePlacement } = require('../controllers/progressController');

const router = express.Router();

router.get('/progress/', protect, getProgress);
router.post('/progress/simulate/', protect, simulatePlacement);

module.exports = router;
