const progressService = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * Handler for POST /api/progress/update
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

    if (!body) {
        return formatResponse(400, { message: "Request body is required" });
    }

    const { teamId, updateText, deltaPercentage } = body;

    // Validation
    if (!teamId || !updateText) {
        console.warn("[WARN] [logUpdate] Missing required fields: teamId or updateText");
        return formatResponse(400, { message: "teamId and updateText are required" });
    }

    const parsedDelta = parseFloat(deltaPercentage);
    if (isNaN(parsedDelta) || parsedDelta < 0 || parsedDelta > 100) {
        console.warn("[WARN] [logUpdate] Invalid deltaPercentage:", deltaPercentage);
        return formatResponse(400, { message: "deltaPercentage must be a number between 0 and 100" });
    }

    try {
        const result = await progressService.logProgress(teamId, updateText, parsedDelta);
        console.log(`[INFO] [logUpdate] Successfully logged progress for teamId: ${teamId}`);
        return formatResponse(201, result);
    } catch (error) {
        console.error(`[ERROR] [logUpdate] Service failure for teamId ${teamId}:`, error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * Handler for GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;
    console.log(`[INFO] [getHistory] Fetching progress history for teamId: ${teamId}`);

    if (!teamId) {
        return formatResponse(400, { message: "teamId path parameter is required" });
    }

    try {
        const logs = await progressService.getProgressLogs(teamId);
        console.log(`[INFO] [getHistory] Successfully retrieved ${logs.length} logs for teamId: ${teamId}`);
        return formatResponse(200, logs);
    } catch (error) {
        console.error(`[ERROR] [getHistory] Service failure for teamId ${teamId}:`, error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
