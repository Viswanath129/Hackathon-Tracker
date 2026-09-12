const express = require('express');
const router = express.Router();
const { logProgress, getProgressHistory } = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

router.post('/update', protect, logProgress);
router.get('/:teamId', protect, getProgressHistory);

module.exports = router;
