const { logProgress, getProgressLogs } = require("../services/progressService");

/**
 * @desc    Log a progress update
 * @route   POST /api/progress/update
 * @access  Private
 */
const logUpdate = async (req, res) => {
    const { teamId, updateText, deltaPercentage } = req.body;

    // Validation
    if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
        return res.status(400).json({ error: "teamId must be a non-empty string" });
    }
    if (!updateText || typeof updateText !== "string" || updateText.trim() === "") {
        return res.status(400).json({ error: "updateText must be a non-empty string" });
    }

    const delta = Number(deltaPercentage);
    if (isNaN(delta) || delta < -100 || delta > 100) {
        return res.status(400).json({ error: "deltaPercentage must be a number between -100 and 100" });
    }

    try {
        const result = await logProgress(teamId, updateText, delta);
        res.status(201).json(result);
    } catch (error) {
        console.error("[ERROR] [progressController.logUpdate]", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * @desc    Get progress history for a team
 * @route   GET /api/progress/:teamId
 * @access  Private
 */
const getHistory = async (req, res) => {
    const { teamId } = req.params;

    if (!teamId) {
        return res.status(400).json({ error: "teamId parameter is required" });
    }

    try {
        const logs = await getProgressLogs(teamId);
        res.status(200).json({ logs });
    } catch (error) {
        console.error("[ERROR] [progressController.getHistory]", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
