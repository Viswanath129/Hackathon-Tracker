const progressService = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Log progress update (Express controller)
 * POST /api/progress/update
 */
const logProgress = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = validation.data;

        const isAuthorized = checkProjectOwnership(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);

        return res.status(201).json({
            message: 'Progress update logged successfully',
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error('Error logging progress update in Express controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Get progress history (Express controller)
 * GET /api/progress/:teamId
 */
const getProgressHistory = async (req, res) => {
    try {
        const { teamId } = req.params;

        if (!teamId) {
            return res.status(400).json({ message: 'teamId path parameter is required' });
        }

        const isAuthorized = checkProjectOwnership(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
        }

        const logs = await progressService.getProgressLogs(teamId);

        return res.status(200).json(logs || []);
    } catch (error) {
        console.error('Error getting progress history in Express controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logProgress,
    getProgressHistory
};
