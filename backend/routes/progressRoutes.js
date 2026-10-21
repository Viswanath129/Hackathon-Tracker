const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { logProgressUpdate, getProgressHistory } = require('../controllers/progressController');

const router = express.Router();

router.route('/update')
    .post(protect, logProgressUpdate);

router.route('/:teamId')
    .get(protect, getProgressHistory);

module.exports = router;
