const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Controller: logUpdate
 * Express route handler for POST /api/progress/update
 */
const logUpdate = async (req, res) => {
    if (!req.body) {
        return res.status(400).json({ message: 'Bad Request: Missing body' });
    }

    const { teamId, updateText, deltaPercentage } = req.body;

    // Validate input payload
    const validation = validateProgressInput({ teamId, updateText, deltaPercentage });
    if (!validation.isValid) {
        return res.status(400).json({ message: validation.error });
    }

    console.log(`[Express progressController] Logging update for teamId: ${teamId}`);

    try {
        // Authorize (BOLA check)
        const authCheck = await checkProjectOwnership(req.user, teamId);
        if (!authCheck.authorized) {
            return res.status(403).json({ message: authCheck.reason || 'Forbidden' });
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (err) {
        console.error(`[Express progressController Error] teamId ${teamId}:`, err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Controller: getHistory
 * Express route handler for GET /api/progress/:teamId
 */
const getHistory = async (req, res) => {
    const { teamId } = req.params;
    if (!teamId) {
        return res.status(400).json({ message: 'Bad Request: Missing teamId parameter' });
    }

    console.log(`[Express progressController] Fetching history for teamId: ${teamId}`);

    try {
        // Authorize (BOLA check)
        const authCheck = await checkProjectOwnership(req.user, teamId);
        if (!authCheck.authorized) {
            return res.status(403).json({ message: authCheck.reason || 'Forbidden' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json({
            teamId,
            logs: logs || []
        });
    } catch (err) {
        console.error(`[Express progressController Error] teamId ${teamId}:`, err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
