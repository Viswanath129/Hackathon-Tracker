const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.error });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        if (!checkProjectOwnership(req.user, teamId)) {
            return res.status(403).json({ message: 'Forbidden: Access denied for this project/team' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({
            message: 'Progress update logged successfully',
            ...result
        });
    } catch (err) {
        console.error('Express progress logUpdate error:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        if (!checkProjectOwnership(req.user, teamId)) {
            return res.status(403).json({ message: 'Forbidden: Access denied for this project/team' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (err) {
        console.error('Express progress getHistory error:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
