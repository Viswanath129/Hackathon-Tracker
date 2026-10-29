const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Controller to log a progress update (POST /api/progress/update)
 */
const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid && !validation.valid) {
            return res.status(400).json({ message: validation.error || validation.message });
        }

        const project = await dynamoService.getProjectById(req.body.teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project or team not found' });
        }

        const isOwner = checkProjectOwnership(req.user, project);
        if (!isOwner) {
            return res.status(403).json({ message: 'Forbidden: Access denied to this project' });
        }

        const savedLog = await dynamoService.saveProgressLog(req.body.teamId, req.body);
        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: savedLog
        });
    } catch (error) {
        console.error('Error in logProgressUpdate:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Controller to get progress history (GET /api/progress/:teamId)
 */
const getProgressHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project or team not found' });
        }

        const isOwner = checkProjectOwnership(req.user, project);
        if (!isOwner) {
            return res.status(403).json({ message: 'Forbidden: Access denied to this project' });
        }

        const logs = await dynamoService.getProgressLogs(teamId);
        return res.status(200).json({
            message: 'Progress history retrieved successfully',
            data: logs
        });
    } catch (error) {
        console.error('Error in getProgressHistory:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logProgressUpdate,
    getProgressHistory
};
