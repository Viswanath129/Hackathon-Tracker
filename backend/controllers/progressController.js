const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');

/**
 * Express Controller: POST /api/progress/update
 */
const logUpdateController = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = validation.data;

        // BOLA / Authorization Check
        if (req.user.role !== 'admin') {
            const project = await dynamoService.getProjectById(teamId);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }

            const isOwner = project.userEmail === req.user.email || project.PK === `USER#${req.user.email.toLowerCase()}`;
            const isMember = req.user.members && Array.isArray(req.user.members) && req.user.members.some(m => m.email === req.user.loginEmail || m.email === req.user.email);

            if (!isOwner && !isMember) {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to access this project' });
            }
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in Express logUpdateController:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Express Controller: GET /api/progress/:teamId
 */
const getHistoryController = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId path parameter is required' });
        }

        // BOLA / Authorization Check
        if (req.user.role !== 'admin') {
            const project = await dynamoService.getProjectById(teamId);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }

            const isOwner = project.userEmail === req.user.email || project.PK === `USER#${req.user.email.toLowerCase()}`;
            const isMember = req.user.members && Array.isArray(req.user.members) && req.user.members.some(m => m.email === req.user.loginEmail || m.email === req.user.email);

            if (!isOwner && !isMember) {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to access this project' });
            }
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json({
            message: 'Progress history retrieved successfully',
            data: logs || []
        });
    } catch (error) {
        console.error('Error in Express getHistoryController:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdateController,
    getHistoryController
};
