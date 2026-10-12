const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Express controller: Log progress update for a project
 */
const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.error });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isAuthorized = checkProjectOwnership(req.user, project);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Not authorized to access this project' });
        }

        const result = await progressService.logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Error logging progress update:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Express controller: Get progress log history for a project
 */
const getProgressHistory = async (req, res) => {
    try {
        const { teamId } = req.params;

        if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isAuthorized = checkProjectOwnership(req.user, project);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Not authorized to access this project' });
        }

        const logs = await progressService.getProgressLogs(teamId);
        return res.status(200).json(logs || []);
    } catch (error) {
        console.error('Error fetching progress history:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logProgressUpdate,
    getProgressHistory
};
