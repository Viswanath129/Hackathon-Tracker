const express = require('express');
const router = express.Router();
const { logProgressUpdate, getHistoryLogs } = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

router.post('/update', protect, logProgressUpdate);
router.get('/:teamId', protect, getHistoryLogs);

module.exports = router;
