const { validateProgressInput } = require("../utils/validation");
const { logProgress, getProgressLogs } = require("../services/progressService");

const logUpdateExpress = async (req, res) => {
    try {
        console.log("[INFO] [logUpdateExpress] Invoked");
        if (!req.body) {
            return res.status(400).json({ message: "Bad Request: Missing request body" });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const validation = validateProgressInput({ teamId, updateText, deltaPercentage });
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        await logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json({ message: "Created", success: true });
    } catch (error) {
        console.error("[ERROR] [logUpdateExpress] Error logging progress:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const getHistoryExpress = async (req, res) => {
    try {
        console.log("[INFO] [getHistoryExpress] Invoked");
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: "Bad Request: Missing teamId parameter" });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error("[ERROR] [getHistoryExpress] Error fetching progress logs:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = { logUpdateExpress, getHistoryExpress };
