const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');
const dynamoService = require('../services/dynamoService');
const progressService = require('../services/progressService');

const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const teamId = req.body.teamId || req.body.projectId;
        const { updateText, deltaPercentage } = req.body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isAuthorized = checkProjectOwnership(req.user, project);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({ message: 'Progress logged successfully', ...result });
    } catch (error) {
        console.error('Express logUpdate error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isAuthorized = checkProjectOwnership(req.user, project);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }

        const logs = await progressService.getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error('Express getHistory error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
