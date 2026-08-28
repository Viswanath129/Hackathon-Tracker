const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

// @desc    Log progress update
// @route   POST /api/progress/update
const logProgressUpdate = async (req, res) => {
    try {
        const { teamId, updateText, deltaPercentage } = req.body || {};

        const validation = validateProgressInput({ teamId, updateText, deltaPercentage });
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const isAuthorized = await checkProjectOwnership(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Insufficient project permissions' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in logProgressUpdate:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// @desc    Get progress history for a team/project
// @route   GET /api/progress/:teamId
const getProgressHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId;

        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const isAuthorized = await checkProjectOwnership(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Insufficient project permissions' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error('Error in getProgressHistory:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logProgressUpdate,
    getProgressHistory
};
