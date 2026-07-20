const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { logUpdate, getHistory } = require('../controllers/progressController');

const router = express.Router();

router.route('/update').post(protect, logUpdate);
router.route('/:teamId').get(protect, getHistory);

module.exports = router;
