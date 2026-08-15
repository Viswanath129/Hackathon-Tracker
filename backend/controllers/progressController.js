const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');

/**
 * Check Broken Object Level Authorization (BOLA) for Express requests
 */
const checkBolaAuthorization = async (user, teamId) => {
    if (user.role === 'admin') {
        return true;
    }

    if (user._id === teamId || user.email === teamId) {
        return true;
    }

    const project = await dynamoService.getProjectById(teamId);
    if (project && (project.team_id === user._id || project.email === user.email)) {
        return true;
    }

    const hackathons = await dynamoService.getHackathonsByUser(user.email);
    for (const hack of hackathons) {
        const projects = await dynamoService.getProjectsByHackathon(hack._id);
        if (projects.some(p => p._id === teamId)) {
            return true;
        }
    }

    return false;
};

// @desc    Log a progress update for a team/project
// @route   POST /api/progress/update
// @access  Private
const logUpdateController = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'Missing request body' });
        }

        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.error });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const isAuthorized = await checkBolaAuthorization(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access to specified team resource denied' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({
            message: 'Progress updated successfully',
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error('Express logUpdateController Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// @desc    Get progress history for a team/project
// @route   GET /api/progress/:teamId
// @access  Private
const getHistoryController = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const isAuthorized = await checkBolaAuthorization(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access to specified team resource denied' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs || []);
    } catch (error) {
        console.error('Express getHistoryController Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdateController,
    getHistoryController
};
