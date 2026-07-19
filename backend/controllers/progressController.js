const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');

/**
 * Express controller for progress updates
 */
const logUpdateController = async (req, res) => {
    try {
        const body = req.body;
        if (!body) {
            return res.status(400).json({ message: 'Request body is missing' });
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return res.status(400).json({ message: 'Validation Failed', errors: validation.errors });
        }

        const { teamId, updateText, deltaPercentage } = body;
        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json(result);
    } catch (error) {
        console.error('Express logUpdate Error:', error);
        return res.status(500).json({ message: error.message });
    }
};

const getHistoryController = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error('Express getHistory Error:', error);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    logUpdate: logUpdateController,
    getHistory: getHistoryController
};
