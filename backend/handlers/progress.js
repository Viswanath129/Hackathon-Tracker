const progressService = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
const logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Received progress update request");

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (error) {
        console.error("[ERROR] [logUpdate] Failed to parse request body:", error);
        return formatResponse(400, { message: "Invalid JSON in request body" });
    }

    const { teamId, updateText, deltaPercentage } = body || {};

    if (!teamId || !updateText || deltaPercentage === undefined) {
        console.warn("[WARN] [logUpdate] Missing required fields:", { teamId, updateText, deltaPercentage });
        return formatResponse(400, { message: "Missing required fields: teamId, updateText, and deltaPercentage are required" });
    }

    const parsedDelta = parseFloat(deltaPercentage);
    if (isNaN(parsedDelta) || parsedDelta < 0 || parsedDelta > 100) {
        console.warn("[WARN] [logUpdate] Invalid deltaPercentage:", deltaPercentage);
        return formatResponse(400, { message: "deltaPercentage must be a number between 0 and 100" });
    }

    try {
        // Map teamId to projectId for the service layer
        const result = await progressService.logProgress(teamId, updateText, parsedDelta);
        console.log(`[INFO] [logUpdate] Successfully logged progress for team: ${teamId}`);
        return formatResponse(201, result);
    } catch (error) {
        console.error(`[ERROR] [logUpdate] Internal server error for team ${teamId}:`, error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;
    console.log(`[INFO] [getHistory] Fetching history for team: ${teamId}`);

    if (!teamId) {
        return formatResponse(400, { message: "teamId is required in path parameters" });
    }

    try {
        const logs = await progressService.getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error(`[ERROR] [getHistory] Failed to fetch logs for team ${teamId}:`, error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

module.exports = { logUpdate, getHistory };
