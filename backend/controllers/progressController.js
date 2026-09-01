const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Express Controller: Log progress update
 * POST /api/progress/update
 */
const logProgressUpdate = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ message: 'Request body is required' });
        }

        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: 'Validation failed', errors: validation.errors });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const isAuthorized = await checkProjectOwnership(teamId, req.user);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission for this project' });
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));

        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in logProgressUpdate controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Express Controller: Get progress history
 * GET /api/progress/:teamId
 */
const getProgressHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const isAuthorized = await checkProjectOwnership(teamId, req.user);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission for this project' });
        }

        const logs = await getProgressLogs(teamId);

        return res.status(200).json({
            message: 'Progress history retrieved successfully',
            data: logs || []
        });
    } catch (error) {
        console.error('Error in getProgressHistory controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logProgressUpdate, getProgressHistory };
