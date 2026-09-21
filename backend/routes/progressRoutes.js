const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

router.post('/update', protect, progressController.logUpdate);
router.get('/:teamId', protect, progressController.getHistory);

module.exports = router;
