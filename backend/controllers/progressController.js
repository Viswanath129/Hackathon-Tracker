const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');

/**
 * Controller for logging a progress update.
 * POST /api/progress/update
 */
const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.error });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        // Fetch project to verify ownership (BOLA) using efficient query helper
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Enforce BOLA
        if (req.user.role !== 'admin' && project.team_id !== req.user._id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json(result);
    } catch (error) {
        console.error('Error logging progress in Express:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Controller for retrieving progress history.
 * GET /api/progress/:teamId
 */
const getProgressHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'Missing teamId parameter' });
        }

        // Fetch project to verify ownership (BOLA) using efficient query helper
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Enforce BOLA
        if (req.user.role !== 'admin' && project.team_id !== req.user._id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error('Error retrieving progress history in Express:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logProgressUpdate, getProgressHistory };
