const progressService = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body || {});
        if (!validation.isValid) {
            return res.status(400).json({ message: 'Validation failed', errors: validation.errors });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const hasAccess = await checkProjectOwnership(req.user, teamId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Forbidden: Access denied to project' });
        }

        const result = await progressService.logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in logUpdate controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId path parameter is required' });
        }

        const hasAccess = await checkProjectOwnership(req.user, teamId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Forbidden: Access denied to project' });
        }

        const logs = await progressService.getProgressLogs(teamId);
        return res.status(200).json({
            teamId,
            logs: logs || []
        });
    } catch (error) {
        console.error('Error in getHistory controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
