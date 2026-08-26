const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Express Controller: Log progress update
 * POST /api/progress/update
 * Returns 201 Created
 */
const logProgressUpdate = async (req, res) => {
    try {
        const { teamId, updateText, deltaPercentage } = req.body || {};

        const validation = validateProgressInput({ teamId, updateText, deltaPercentage });
        if (!validation.valid) {
            return res.status(400).json({ message: validation.error });
        }

        const isAuthorized = await checkProjectOwnership(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access to this project is not authorized' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({
            message: 'Progress update logged successfully',
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error('Express logProgressUpdate Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Express Controller: Get progress history
 * GET /api/progress/:teamId
 * Returns 200 OK
 */
const getProgressHistory = async (req, res) => {
    try {
        const { teamId } = req.params;

        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const isAuthorized = await checkProjectOwnership(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access to this project is not authorized' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error('Express getProgressHistory Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logProgressUpdate, getProgressHistory };
