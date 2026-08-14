const { validateProgressInput } = require('../utils/validation');
const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');

/**
 * Log a progress update (Express endpoint POST /api/progress/update)
 */
const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.error });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (req.user.role !== 'admin' && project.team_id !== req.user._id && project.user_id !== req.user._id) {
            return res.status(403).json({ message: 'Forbidden: Access denied to project' });
        }

        const logResult = await logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: logResult
        });
    } catch (error) {
        console.error("Express logProgressUpdate Error:", error);
        return res.status(500).json({ message: error.message || 'Server Error' });
    }
};

/**
 * Get progress history for a team/project (Express endpoint GET /api/progress/:teamId)
 */
const getProgressHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (req.user.role !== 'admin' && project.team_id !== req.user._id && project.user_id !== req.user._id) {
            return res.status(403).json({ message: 'Forbidden: Access denied to project' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error("Express getProgressHistory Error:", error);
        return res.status(500).json({ message: error.message || 'Server Error' });
    }
};

module.exports = {
    logProgressUpdate,
    getProgressHistory
};
