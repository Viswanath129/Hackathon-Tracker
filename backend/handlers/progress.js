const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * Handler for POST /api/progress/update
 */
exports.logUpdate = async (event) => {
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

    if (!teamId || !updateText || deltaPercentage === undefined) {
        return formatResponse(400, { message: "Missing required fields: teamId, updateText, deltaPercentage" });
    }

    const delta = parseFloat(deltaPercentage);
    if (isNaN(delta) || delta < 0 || delta > 100) {
        return formatResponse(400, { message: "deltaPercentage must be a number between 0 and 100" });
    }

    try {
        console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);
        const result = await logProgress(teamId, updateText, delta);
        return formatResponse(200, result);
    } catch (error) {
        console.error(`[ERROR] [logUpdate] Internal error for teamId ${teamId}:`, error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

/**
 * Handler for GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;

    if (!teamId) {
        return formatResponse(400, { message: "teamId is required in path" });
    }

    console.log(`[INFO] [getHistory] Fetching progress history for teamId: ${teamId}`);

    try {
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, { teamId, logs });
    } catch (error) {
        console.error(`[ERROR] [getHistory] Internal error for teamId ${teamId}:`, error);
        return formatResponse(500, { message: "Internal server error" });
    }
};
