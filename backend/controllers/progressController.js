const { logProgress, getProgressLogs, ValidationError } = require("../services/progressService");

/**
 * @desc    Log progress update
 * @route   POST /api/progress/update
 */
const logUpdate = async (req, res) => {
    try {
        const { teamId, updateText, deltaPercentage } = req.body;
        const result = await logProgress(teamId, updateText, deltaPercentage);
        res.status(201).json({
            message: "Progress logged successfully",
            ...result
        });
    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({ message: error.message });
        }
        console.error(`[ERROR] [progressController.logUpdate] ${error.message}`);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * @desc    Get progress history
 * @route   GET /api/progress/:teamId
 */
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        const logs = await getProgressLogs(teamId);
        res.json(logs);
    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({ message: error.message });
        }
        console.error(`[ERROR] [progressController.getHistory] ${error.message}`);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
