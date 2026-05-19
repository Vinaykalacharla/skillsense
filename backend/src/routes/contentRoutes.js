const express = require('express');
const { landingContent } = require('../controllers/contentController');

const router = express.Router();

router.get('/landing/', landingContent);

module.exports = router;
