const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { logProgressUpdate, getHistory } = require('../controllers/progressController');

const router = express.Router();

router.post('/update', protect, logProgressUpdate);
router.get('/:teamId', protect, getHistory);

module.exports = router;
