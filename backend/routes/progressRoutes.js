const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { logUpdate, getHistory } = require('../controllers/progressController');

const router = express.Router();

router.post('/update', protect, logUpdate);
router.get('/:teamId', protect, getHistory);

module.exports = router;
