const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const dynamoService = require('../services/dynamoService');

/**
 * Express Controller: Log progress update
 * POST /api/progress/update
 */
const logUpdate = async (req, res) => {
    try {
        const { teamId, updateText, deltaPercentage } = req.body || {};

        const validation = validateProgressInput({ teamId, updateText, deltaPercentage });
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        // BOLA Check: req.user is populated by protect middleware
        const isAuthorized = await checkProjectAuthorization(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to access this project.' });
        }

        const result = await logProgress(teamId, updateText.trim(), Number(deltaPercentage));
        return res.status(201).json({
            message: 'Progress update logged successfully.',
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error('Express logUpdate error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Express Controller: Get progress log history
 * GET /api/progress/:teamId
 */
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId path parameter is required.' });
        }

        // BOLA Check: req.user is populated by protect middleware
        const isAuthorized = await checkProjectAuthorization(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to access this project.' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json({
            teamId,
            logs: logs || []
        });
    } catch (error) {
        console.error('Express getHistory error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Helper to check BOLA access
 */
async function checkProjectAuthorization(user, teamId) {
    if (!user) return false;
    if (user.role === 'admin') return true;

    const userEmail = (user.email || user.loginEmail || '').toLowerCase();
    if (!userEmail) return false;

    if (user._id === teamId || user.teamId === teamId) {
        return true;
    }

    try {
        const allProjects = await dynamoService.getAllProjects();
        const project = allProjects.find(p => p._id === teamId);
        if (project) {
            if (project.ownerEmail && project.ownerEmail.toLowerCase() === userEmail) {
                return true;
            }
            if (project.teamId && project.teamId === teamId) {
                return true;
            }
        }
    } catch (err) {
        console.error('Project auth check failed:', err);
    }

    return false;
}

module.exports = {
    logUpdate,
    getHistory
};
