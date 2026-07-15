const { logProgress, getProgressLogs } = require("../services/progressService");
const { validateProgressInput } = require("../utils/validation");

/**
 * @desc    Log project progress update
 * @route   POST /api/progress/update
 * @access  Private
 */
const logUpdate = async (req, res) => {
    try {
        const { teamId, updateText, deltaPercentage } = req.body;

        const validation = validateProgressInput(teamId, updateText, deltaPercentage);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.error });
        }

        const result = await logProgress(teamId, updateText, validation.delta);
        res.status(201).json({
            message: "Progress logged successfully",
            ...result
        });
    } catch (error) {
        console.error("[ERROR] [progressController.logUpdate]", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * @desc    Get project progress history
 * @route   GET /api/progress/:teamId
 * @access  Private
 */
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;

        if (!teamId) {
            return res.status(400).json({ message: "teamId parameter is required" });
        }

        const logs = await getProgressLogs(teamId);
        res.status(200).json(logs);
    } catch (error) {
        console.error("[ERROR] [progressController.getHistory]", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
