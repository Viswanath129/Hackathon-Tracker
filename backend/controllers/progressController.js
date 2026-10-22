const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = validation.data;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project)) {
            return res.status(403).json({ message: 'Forbidden: You do not own this project' });
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({ message: 'Progress update logged successfully', data: result });
    } catch (error) {
        console.error('Error in logUpdate controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;

        if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project)) {
            return res.status(403).json({ message: 'Forbidden: You do not own this project' });
        }

        const logs = await progressService.getProgressLogs(teamId);
        return res.status(200).json({ message: 'Progress logs retrieved successfully', data: logs });
    } catch (error) {
        console.error('Error in getHistory controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
