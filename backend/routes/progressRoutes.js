const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const progressController = require('../controllers/progressController');

router.post('/update', protect, progressController.logUpdate);
router.get('/:teamId', protect, progressController.getHistory);

module.exports = router;
