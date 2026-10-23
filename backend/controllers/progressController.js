const dynamoService = require('../services/dynamoService');
const progressService = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.error });
        }

        const project = await dynamoService.getProjectById(req.body.teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isOwner = checkProjectOwnership(req.user, project);
        if (!isOwner) {
            return res.status(403).json({ message: 'Forbidden: Not authorized to update this project' });
        }

        const log = await progressService.logProgress(req.body.teamId, req.body.updateText, req.body.deltaPercentage);
        return res.status(201).json({ message: 'Progress log created successfully', log });
    } catch (error) {
        console.error('Error in progressController.logUpdate:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isOwner = checkProjectOwnership(req.user, project);
        if (!isOwner) {
            return res.status(403).json({ message: 'Forbidden: Not authorized to view progress history' });
        }

        const logs = await progressService.getProgressLogs(teamId);
        return res.status(200).json({ success: true, data: logs });
    } catch (error) {
        console.error('Error in progressController.getHistory:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
