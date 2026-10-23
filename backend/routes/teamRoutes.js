const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
    getTeamProfile,
    updateTeamProfile,
    createHackathon,
    getHackathons,
    updateHackathon,
    deleteHackathon,
    createProject,
    getProjects,
    updateProjectStatus,
    uploadReport,
    getReports,
    reportIssue,
    getTeamIssues,
    getProjectHistory,
    getSignedDownloadUrl,
    getLeaderboard,
    getActivities,
    deleteProject,
    deleteArtifact
} = require('../controllers/teamController');

const router = express.Router();

router.route('/activity').get(protect, getActivities);

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max per file
});

router.route('/profile')
    .get(protect, getTeamProfile)
    .put(protect, updateTeamProfile);

router.route('/hackathons')
    .post(protect, createHackathon)
    .get(protect, getHackathons);

router.route('/hackathons/:id')
    .put(protect, updateHackathon)
    .delete(protect, deleteHackathon);

router.route('/projects')
    .post(protect, createProject);

router.route('/projects/:hackathonId')
    .get(protect, getProjects);

router.route('/projects/:id/status')
    .put(protect, updateProjectStatus);

router.route('/projects/:id')
    .delete(protect, deleteProject);

router.route('/projects/:id/history')
    .get(protect, getProjectHistory);

router.route('/reports/:id/download')
    .get(protect, getSignedDownloadUrl);

router.route('/reports/:id')
    .delete(protect, deleteArtifact);

router.route('/projects/:id/report')
    .post(protect, upload.single('pdf'), uploadReport);

router.route('/projects/:id/reports')
    .get(protect, getReports);

router.route('/issues')
    .post(protect, upload.single('image'), reportIssue)
    .get(protect, getTeamIssues);

router.route('/leaderboard')
    .get(protect, getLeaderboard);

module.exports = router;
