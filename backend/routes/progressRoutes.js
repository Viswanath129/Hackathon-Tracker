const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { logProgressUpdate, getProgressHistory } = require('../controllers/progressController');

router.post('/update', protect, logProgressUpdate);
router.get('/:teamId', protect, getProgressHistory);

module.exports = router;
