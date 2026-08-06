const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { logProgressUpdate, getProgressHistory } = require('../controllers/progressController');

const router = express.Router();

router.post('/update', protect, logProgressUpdate);
router.get('/:teamId', protect, getProgressHistory);

module.exports = router;
