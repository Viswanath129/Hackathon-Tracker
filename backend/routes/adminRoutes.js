const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getAnalytics,
    getTeams,
    getTeamById,
    deleteTeam,
    gradeReport,
    rateProject,
    deleteReport,
    getSignedDownloadUrl,
    listS3Files,
    getActivities
} = require('../controllers/adminController');

const router = express.Router();

router.route('/analytics').get(protect, admin, getAnalytics);
router.route('/activities').get(protect, admin, getActivities);
router.route('/teams').get(protect, admin, getTeams);
router.route('/teams/:id')
    .get(protect, admin, getTeamById)
    .delete(protect, admin, deleteTeam);

router.route('/reports/:id/grade')
    .put(protect, admin, gradeReport);

router.route('/projects/:id/rate')
    .put(protect, admin, rateProject);

router.route('/reports/:id/download')
    .get(protect, admin, getSignedDownloadUrl);

router.route('/reports/:id')
    .delete(protect, admin, deleteReport);

router.route('/s3/list')
    .get(protect, admin, listS3Files);

module.exports = router;
