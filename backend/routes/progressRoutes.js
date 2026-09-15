const express = require('express');
const router = express.Router();
const { logProgressUpdate, getProgressHistory } = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

router.post('/update', protect, logProgressUpdate);
router.get('/:teamId', protect, getProgressHistory);

module.exports = router;
