const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');

// @desc    Log a progress update for a project/team
// @route   POST /api/progress/update
// @access  Private
const logUpdate = async (req, res) => {
    try {
        const { teamId, updateText, deltaPercentage } = req.body;
        const validation = validateProgressInput({ teamId, updateText, deltaPercentage });

        if (!validation.isValid) {
            return res.status(400).json({ message: 'Bad Request', errors: validation.errors });
        }

        // teamId maps to projectId in the service layer
        const result = await logProgress(teamId, updateText, deltaPercentage);
        res.status(201).json({ success: true, message: 'Progress logged successfully', ...result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get progress logs history for a project/team
// @route   GET /api/progress/:teamId
// @access  Private
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId is required' });
        }

        // teamId maps to projectId in the service layer
        const logs = await getProgressLogs(teamId);
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { logUpdate, getHistory };
