const express = require('express');
const router = express.Router();
const { logUpdateController, getHistoryController } = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

router.post('/update', protect, logUpdateController);
router.get('/:teamId', protect, getHistoryController);

module.exports = router;
