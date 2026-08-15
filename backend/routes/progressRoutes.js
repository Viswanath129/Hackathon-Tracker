const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { logUpdateController, getHistoryController } = require('../controllers/progressController');

router.post('/update', protect, logUpdateController);
router.get('/:teamId', protect, getHistoryController);

module.exports = router;
