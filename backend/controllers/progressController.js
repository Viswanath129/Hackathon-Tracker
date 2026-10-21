const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project)) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({
            message: 'Progress update logged successfully',
            timestamp: result.timestamp,
            data: { teamId, updateText, deltaPercentage }
        });
    } catch (error) {
        console.error('Express logProgressUpdate error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getProgressHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId;
        if (!teamId) {
            return res.status(400).json({ message: 'Missing teamId parameter' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project)) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs || []);
    } catch (error) {
        console.error('Express getProgressHistory error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logProgressUpdate,
    getProgressHistory
};
