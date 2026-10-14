const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const teamId = req.body.teamId || req.body.projectId;
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project)) {
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }

        const result = await progressService.logProgress(teamId, req.body.updateText, req.body.deltaPercentage);

        return res.status(201).json({
            message: 'Progress update logged successfully',
            ...result
        });
    } catch (error) {
        console.error('Error in logProgressUpdate controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getProgressHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project)) {
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }

        const logs = await progressService.getProgressLogs(teamId);

        return res.status(200).json({
            success: true,
            logs: logs || []
        });
    } catch (error) {
        console.error('Error in getProgressHistory controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logProgressUpdate, getProgressHistory };
