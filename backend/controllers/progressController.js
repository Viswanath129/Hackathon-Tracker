const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Log a new progress update for a team/project.
 * POST /api/progress/update
 */
const logUpdate = async (req, res) => {
    try {
        const { teamId, updateText, deltaPercentage } = req.body || {};

        // Input validation
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.error });
        }

        // Verify project existence (404 if not found)
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // BOLA Authorization check
        if (!checkProjectOwnership(req.user, teamId)) {
            return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
        }

        const result = await progressService.logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json({
            message: 'Progress logged successfully',
            result
        });
    } catch (error) {
        console.error('Error logging progress update:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Get progress update history for a team/project.
 * GET /api/progress/:teamId
 */
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;

        if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        // Verify project existence (404 if not found)
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // BOLA Authorization check
        if (!checkProjectOwnership(req.user, teamId)) {
            return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
        }

        const logs = await progressService.getProgressLogs(teamId);
        return res.status(200).json(logs || []);
    } catch (error) {
        console.error('Error fetching progress history:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
