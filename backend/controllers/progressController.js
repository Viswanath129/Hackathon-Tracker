const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * @desc    Log a progress update for a project (Express)
 * @route   POST /api/progress/update
 * @access  Private
 */
const logProgressUpdate = async (req, res) => {
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

        const isOwner = checkProjectOwnership(req.user, project);
        if (!isOwner) {
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json({ message: 'Progress update logged successfully', ...result });
    } catch (error) {
        console.error('Error in logProgressUpdate controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * @desc    Get progress history for a project (Express)
 * @route   GET /api/progress/:teamId
 * @access  Private
 */
const getProgressHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isOwner = checkProjectOwnership(req.user, project);
        if (!isOwner) {
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }

        const logs = await getProgressLogs(teamId);
        return res.json(logs);
    } catch (error) {
        console.error('Error in getProgressHistory controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logProgressUpdate, getProgressHistory };
