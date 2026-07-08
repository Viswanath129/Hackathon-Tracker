const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Request received");

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (error) {
        return formatResponse(400, { message: "Invalid JSON in request body" });
    }

    if (!body) {
        return formatResponse(400, { message: "Request body is missing" });
    }

    const { teamId, updateText, deltaPercentage } = body;

    // Validation
    if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
        return formatResponse(400, { message: "teamId is required and must be a non-empty string" });
    }

    if (!updateText || typeof updateText !== "string" || updateText.trim() === "") {
        return formatResponse(400, { message: "updateText is required and must be a non-empty string" });
    }

    const numericDelta = Number(deltaPercentage);
    if (isNaN(numericDelta) || numericDelta < -100 || numericDelta > 100) {
        return formatResponse(400, { message: "deltaPercentage must be a numeric value between -100 and 100" });
    }

    try {
        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await logProgress(teamId, updateText, numericDelta);
        return formatResponse(201, {
            message: "Progress logged successfully",
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error("[ERROR] [logUpdate] Error logging progress:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    console.log("[INFO] [getHistory] Request received");

    const teamId = event.pathParameters?.teamId;

    if (!teamId) {
        return formatResponse(400, { message: "teamId is required in path parameters" });
    }

    try {
        console.log(`[INFO] [getHistory] Fetching history for team: ${teamId}`);
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, {
            teamId,
            logs
        });
    } catch (error) {
        console.error("[ERROR] [getHistory] Error fetching progress logs:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};
