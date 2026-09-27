const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logProgressUpdate = async (req, res) => {
    const { teamId, updateText, deltaPercentage } = req.body || {};

    const validation = validateProgressInput(teamId, updateText, deltaPercentage);
    if (!validation.isValid) {
        return res.status(400).json({ message: validation.message });
    }

    try {
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project)) {
            return res.status(403).json({ message: 'Forbidden: Access denied to project' });
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json({
            message: 'Progress update logged successfully',
            timestamp: result.timestamp,
            projectId: teamId
        });
    } catch (error) {
        console.error('Error logging progress update:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getProgressHistory = async (req, res) => {
    const { teamId } = req.params;

    if (!teamId) {
        return res.status(400).json({ message: 'teamId is required' });
    }

    try {
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project)) {
            return res.status(403).json({ message: 'Forbidden: Access denied to project' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json({
            projectId: teamId,
            logs: logs || []
        });
    } catch (error) {
        console.error('Error fetching progress history:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logProgressUpdate,
    getProgressHistory
};
