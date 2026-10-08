const { logProgress, getProgressLogs } = require('../services/progressService');
const { getProjectById } = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Log progress update for a project via Express
 * POST /api/progress/update
 */
const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const project = await getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isOwner = checkProjectOwnership(project, req.user);
        if (!isOwner) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission for this project' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in logProgressUpdate controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Get progress history for a project via Express
 * GET /api/progress/:teamId
 */
const getProgressHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const project = await getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isOwner = checkProjectOwnership(project, req.user);
        if (!isOwner) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission for this project' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json({ logs: logs || [] });
    } catch (error) {
        console.error('Error in getProgressHistory controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logProgressUpdate,
    getProgressHistory
};
