const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const dynamoService = require('../services/dynamoService');

/**
 * @desc    Log a progress update for a project
 * @route   POST /api/progress/update
 * @access  Private
 */
const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // BOLA Verification: Non-admin users can only log updates for their owned projects
        if (req.user.role !== 'admin' && project.team_id !== req.user._id) {
            return res.status(403).json({ message: 'Forbidden: Access denied to this project' });
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json({
            message: 'Progress update logged successfully',
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error('[ERROR] [Express logUpdate]', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * @desc    Get progress history for a project
 * @route   GET /api/progress/:teamId
 * @access  Private
 */
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // BOLA Verification: Non-admin users can only view history for their owned projects
        if (req.user.role !== 'admin' && project.team_id !== req.user._id) {
            return res.status(403).json({ message: 'Forbidden: Access denied to this project' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error('[ERROR] [Express getHistory]', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
