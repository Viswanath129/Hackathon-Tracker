const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.error });
        }

        const project = await dynamoService.getProjectById(req.body.teamId);
        if (!project || !checkProjectOwnership(req.user, project)) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const result = await logProgress(req.body.teamId, req.body.updateText, req.body.deltaPercentage);
        return res.status(201).json({ message: 'Progress update logged successfully', ...result });
    } catch (error) {
        console.error('Express logUpdate error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId || req.params.id;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project || !checkProjectOwnership(req.user, project)) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const logs = await getProgressLogs(teamId);
        return res.json(logs);
    } catch (error) {
        console.error('Express getHistory error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
