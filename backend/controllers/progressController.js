const { logProgress, getProgressLogs } = require("../services/progressService");
const { validateProgressInput } = require("../utils/validation");

/**
 * Express logUpdate controller
 * POST /api/progress/update
 */
const logUpdate = async (req, res) => {
    try {
        const { teamId, updateText, deltaPercentage } = req.body || {};

        const validationResult = validateProgressInput(teamId, updateText, deltaPercentage);
        if (!validationResult.valid) {
            return res.status(400).json({ error: validationResult.message });
        }

        // Map teamId to projectId in the service layer
        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({ success: true, timestamp: result.timestamp });
    } catch (error) {
        console.error("[ERROR] Express logUpdate failed:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * Express getHistory controller
 * GET /api/progress/:teamId
 */
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;

        if (!teamId || teamId.trim() === "") {
            return res.status(400).json({ error: "teamId parameter is required" });
        }

        // Map teamId to projectId in the service layer
        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error("[ERROR] Express getHistory failed:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
