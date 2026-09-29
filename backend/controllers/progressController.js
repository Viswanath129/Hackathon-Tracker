const { logProgress, getProgressLogs } = require('../services/progressService');
const { getProjectById } = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Controller for logging progress updates via Express.
 * POST /api/progress/update
 */
const logUpdate = async (req, res) => {
    try {
        const { teamId, updateText, deltaPercentage } = req.body || {};

        const validation = validateProgressInput(teamId, updateText, deltaPercentage);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.error });
        }

        const project = await getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isAuthorized = checkProjectOwnership(req.user, project);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);

        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in progressController.logUpdate:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Controller for getting progress history via Express.
 * GET /api/progress/:teamId
 */
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;

        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const project = await getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isAuthorized = checkProjectOwnership(req.user, project);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
        }

        const logs = await getProgressLogs(teamId);

        return res.status(200).json({
            message: 'Progress history retrieved successfully',
            data: logs || []
        });
    } catch (error) {
        console.error('Error in progressController.getHistory:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
