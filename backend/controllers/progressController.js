const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Express controller to log progress update (POST /api/progress/update)
 */
const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = validation.data;

        const isAuthorized = await checkProjectOwnership(teamId, req.user);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access denied for this project' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({
            success: true,
            timestamp: result.timestamp,
            message: 'Progress update logged successfully'
        });
    } catch (error) {
        console.error('Express logProgressUpdate Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Express controller to get progress history (GET /api/progress/:teamId)
 */
const getProgressHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId;
        if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const isAuthorized = await checkProjectOwnership(teamId, req.user);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access denied for this project' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs || []);
    } catch (error) {
        console.error('Express getProgressHistory Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logProgressUpdate, getProgressHistory };
