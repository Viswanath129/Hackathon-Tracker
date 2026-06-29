const { formatResponse } = require("./utils");
const { logProgress, getProgressLogs } = require("../services/progressService");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
const logUpdate = async (event) => {
    try {
        console.log("[INFO] [logUpdate] Received progress update request");

        if (!event.body) {
            return formatResponse(400, { message: "Request body is missing" });
        }

        let body;
        try {
            body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        } catch (e) {
            console.error("[ERROR] [logUpdate] Failed to parse JSON body", e);
            return formatResponse(400, { message: "Invalid JSON format" });
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Validation
        if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
            return formatResponse(400, { message: "teamId is required and must be a non-empty string" });
        }
        if (!updateText || typeof updateText !== "string" || updateText.trim() === "") {
            return formatResponse(400, { message: "updateText is required and must be a non-empty string" });
        }

        const delta = Number(deltaPercentage);
        if (isNaN(delta) || delta < -100 || delta > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a number between -100 and 100" });
        }

        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await logProgress(teamId, updateText, delta);

        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] [logUpdate] Unhandled exception", error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    try {
        const teamId = event.pathParameters?.teamId;

        if (!teamId) {
            return formatResponse(400, { message: "teamId is required in path parameters" });
        }

        console.log(`[INFO] [getHistory] Fetching history for team: ${teamId}`);
        const logs = await getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Unhandled exception", error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

module.exports = { logUpdate, getHistory };
