const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Log progress update via Express route POST /api/progress/update
 */
const logProgressUpdate = async (req, res) => {
    try {
        if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'Request body is required' });
        }

        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        console.log(`Processing Express progress update for teamId: ${teamId}`);

        if (req.user) {
            const isAuthorized = await checkProjectOwnership(teamId, req.user);
            if (!isAuthorized) {
                return res.status(403).json({ message: 'Forbidden: Unauthorized access to project resource' });
            }
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));

        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Unhandled error in Express logProgressUpdate:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Get progress history via Express route GET /api/progress/:teamId
 */
const getProgressHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId path parameter is required' });
        }

        console.log(`Fetching Express progress history for teamId: ${teamId}`);

        if (req.user) {
            const isAuthorized = await checkProjectOwnership(teamId, req.user);
            if (!isAuthorized) {
                return res.status(403).json({ message: 'Forbidden: Unauthorized access to project resource' });
            }
        }

        const logs = await getProgressLogs(teamId);

        return res.status(200).json({
            message: 'Progress history retrieved successfully',
            data: logs || []
        });
    } catch (error) {
        console.error('Unhandled error in Express getProgressHistory:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logProgressUpdate,
    getProgressHistory
};
