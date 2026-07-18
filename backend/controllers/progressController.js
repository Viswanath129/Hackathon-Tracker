const progressService = require("../services/progressService");
const { validateProgressInput } = require("../utils/validation");

/**
 * Log a progress update for a project/team
 * POST /api/progress/update
 */
const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.error });
        }

        const { teamId, updateText, deltaPercentage } = req.body;
        await progressService.logProgress(teamId, updateText, deltaPercentage);

        return res.status(201).json({ message: "Progress logged successfully" });
    } catch (error) {
        console.error("Express Log Update Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * Get progress history for a project/team
 * GET /api/progress/:teamId
 */
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
            return res.status(400).json({ message: "teamId parameter is required" });
        }

        const logs = await progressService.getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error("Express Get History Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
