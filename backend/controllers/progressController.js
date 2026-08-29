const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const teamId = req.body.teamId || req.body.projectId;
        const updateText = req.body.updateText || req.body.update_text;
        const deltaPercentage = Number(req.body.deltaPercentage !== undefined ? req.body.deltaPercentage : req.body.delta_percentage);

        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized: Missing user authentication' });
        }

        const isAuthorized = await checkProjectOwnership(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access denied for project' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Express logUpdate error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId || req.params.id;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId is required' });
        }

        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized: Missing user authentication' });
        }

        const isAuthorized = await checkProjectOwnership(req.user, teamId);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access denied for project' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs || []);
    } catch (error) {
        console.error('Express getHistory error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
