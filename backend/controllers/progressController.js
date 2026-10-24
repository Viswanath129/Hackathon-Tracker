const dynamoService = require('../services/dynamoService');
const progressService = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logUpdate = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ message: 'Request body is required' });
        }

        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.error });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project, teamId)) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);

        return res.status(201).json({
            message: 'Progress update logged successfully',
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error('Error logging progress update:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project, teamId)) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const logs = await progressService.getProgressLogs(teamId);

        return res.status(200).json(logs);
    } catch (error) {
        console.error('Error fetching progress history:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
