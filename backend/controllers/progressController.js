const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Express Controller: logUpdate
 * POST /api/progress/update
 */
const logUpdate = async (req, res) => {
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
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({
            message: 'Progress updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in Express logUpdate controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Express Controller: getHistory
 * GET /api/progress/:teamId
 */
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId || teamId.trim().length === 0) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project)) {
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json({ progress: logs || [] });
    } catch (error) {
        console.error('Error in Express getHistory controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
