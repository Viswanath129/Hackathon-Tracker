const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');

/**
 * Log progress update (Express handler)
 * POST /api/progress/update
 */
const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.error });
        }

        const { teamId, updateText, deltaPercentage } = validation.data;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // BOLA Verification
        const isAdmin = req.user && req.user.role === 'admin';
        const isOwner = req.user && (project.team_id === req.user._id || project.email === req.user.email || (req.user.email && project.PK === `USER#${req.user.email.toLowerCase()}`));

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Forbidden: Access denied for this project' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({
            message: 'Progress update logged successfully',
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error('Error in Express logUpdate controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Get progress history (Express handler)
 * GET /api/progress/:teamId
 */
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // BOLA Verification
        const isAdmin = req.user && req.user.role === 'admin';
        const isOwner = req.user && (project.team_id === req.user._id || project.email === req.user.email || (req.user.email && project.PK === `USER#${req.user.email.toLowerCase()}`));

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Forbidden: Access denied for this project' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs || []);
    } catch (error) {
        console.error('Error in Express getHistory controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
