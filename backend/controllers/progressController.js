const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const isOwner = await checkProjectOwnership(req.user, teamId);
        if (!isOwner) {
            return res.status(403).json({ message: 'Forbidden: Access denied to target project' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({ message: 'Progress update logged successfully', data: result });
    } catch (error) {
        console.error('Error logging progress update:', error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};

const getProgressHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId || req.params.id;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const isOwner = await checkProjectOwnership(req.user, teamId);
        if (!isOwner) {
            return res.status(403).json({ message: 'Forbidden: Access denied to target project history' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error('Error fetching progress history:', error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};

module.exports = {
    logProgressUpdate,
    getProgressHistory
};
