const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');

// @desc    Log a progress update
// @route   POST /api/progress/update
// @access  Private
const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        // BOLA check
        if (req.user && req.user.role !== 'admin') {
            const project = await dynamoService.getProjectById(teamId);
            if (project) {
                if (project.team_id !== req.user._id && project.team_id !== req.user.email) {
                    return res.status(403).json({ message: 'Forbidden: BOLA check failed' });
                }
            } else if (req.user._id !== teamId && req.user.email !== teamId) {
                return res.status(403).json({ message: 'Forbidden: BOLA check failed' });
            }
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json(result);
    } catch (error) {
        console.error('Express progressController logUpdate error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

// @desc    Get progress log history for a project/team
// @route   GET /api/progress/:teamId
// @access  Private
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        // BOLA check
        if (req.user && req.user.role !== 'admin') {
            const project = await dynamoService.getProjectById(teamId);
            if (project) {
                if (project.team_id !== req.user._id && project.team_id !== req.user.email) {
                    return res.status(403).json({ message: 'Forbidden: BOLA check failed' });
                }
            } else if (req.user._id !== teamId && req.user.email !== teamId) {
                return res.status(403).json({ message: 'Forbidden: BOLA check failed' });
            }
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error('Express progressController getHistory error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
