const express = require('express');
const router = express.Router();
const { logProgressUpdate, getProgressHistory } = require('../controllers/progressController');

router.post('/update', logProgressUpdate);
router.get('/:teamId', getProgressHistory);

module.exports = router;
