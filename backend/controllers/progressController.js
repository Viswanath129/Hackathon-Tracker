const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

// @desc    Log a progress update for a project/team
// @route   POST /api/progress/update
// @access  Private
const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const authCheck = await checkProjectOwnership(req.user, teamId);
        if (!authCheck.authorized) {
            return res.status(authCheck.statusCode || 403).json({ message: authCheck.message });
        }

        const numericDelta = Number(deltaPercentage);
        const result = await progressService.logProgress(teamId, updateText, numericDelta);

        if (authCheck.project) {
            const project = authCheck.project;
            const newProgress = Math.max(0, Math.min(100, (project.progress_percentage || 0) + numericDelta));
            await dynamoService.saveProject(project.hackathon_id, {
                ...project,
                progress_percentage: newProgress
            });
        }

        res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Error logging progress update:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// @desc    Get progress history for a project/team
// @route   GET /api/progress/:teamId
// @access  Private
const getProgressHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const authCheck = await checkProjectOwnership(req.user, teamId);
        if (!authCheck.authorized) {
            return res.status(authCheck.statusCode || 403).json({ message: authCheck.message });
        }

        const logs = await progressService.getProgressLogs(teamId);
        res.status(200).json(logs || []);
    } catch (error) {
        console.error('Error fetching progress history:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logProgressUpdate,
    getProgressHistory
};
