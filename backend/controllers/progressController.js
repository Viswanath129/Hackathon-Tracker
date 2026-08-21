const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');

const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.error });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        if (req.user && req.user.role !== 'admin') {
            const userTeamId = req.user.teamId || req.user._id;
            if (!userTeamId || userTeamId !== teamId) {
                return res.status(403).json({ message: 'Forbidden: Access denied for specified project' });
            }
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json({ message: 'Progress update logged successfully', data: result });
    } catch (error) {
        console.error('Express logUpdate error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'Missing teamId parameter' });
        }

        if (req.user && req.user.role !== 'admin') {
            const userTeamId = req.user.teamId || req.user._id;
            if (!userTeamId || userTeamId !== teamId) {
                return res.status(403).json({ message: 'Forbidden: Access denied for specified project' });
            }
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error('Express getHistory error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
