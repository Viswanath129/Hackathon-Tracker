const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');

/**
 * @desc    Log a progress update for a project (Express)
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
        await logProgress(teamId, updateText, deltaPercentage);

        return res.status(201).json({ message: "Progress logged successfully" });
    } catch (error) {
        console.error("Express logUpdate Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * @desc    Get progress logs for a project (Express)
 * @route   GET /api/progress/:teamId
 * @access  Private
 */
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: "Missing teamId" });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error("Express getHistory Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
