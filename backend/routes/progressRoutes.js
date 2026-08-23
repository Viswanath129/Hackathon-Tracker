const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { logUpdate, getHistory } = require('../controllers/progressController');

router.post('/update', protect, logUpdate);
router.get('/:teamId', protect, getHistory);

module.exports = router;
