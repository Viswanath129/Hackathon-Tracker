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

        const isAuthorized = await checkProjectOwnership(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access denied to this project' });
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json(result);
    } catch (error) {
        console.error("Progress Log Error:", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId;
        if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const isAuthorized = await checkProjectOwnership(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access denied to this project' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error("Get History Error:", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
