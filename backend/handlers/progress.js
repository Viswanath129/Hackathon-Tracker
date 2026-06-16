const { formatResponse } = require("./utils");
const { logProgress, getProgressLogs } = require("../services/progressService");

/**
 * Handler for POST /api/progress/update
 */
exports.logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Received progress update request");

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (error) {
        console.error("[ERROR] [logUpdate] Malformed JSON in request body", error);
        return formatResponse(400, { message: "Invalid JSON in request body" });
    }

    if (!body) {
        return formatResponse(400, { message: "Missing request body" });
    }

    const { teamId, updateText, deltaPercentage } = body;

    if (!teamId || !updateText) {
        return formatResponse(400, { message: "Missing teamId or updateText" });
    }

    const parsedDelta = parseFloat(deltaPercentage);
    if (isNaN(parsedDelta) || parsedDelta < 0 || parsedDelta > 100) {
        return formatResponse(400, { message: "deltaPercentage must be a number between 0 and 100" });
    }

    try {
        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await logProgress(teamId, updateText, parsedDelta);
        return formatResponse(201, {
            message: "Progress log created successfully",
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error("[ERROR] [logUpdate] Failed to log progress", error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

/**
 * Handler for GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    console.log("[INFO] [getHistory] Received request for progress history");

    const teamId = event.pathParameters?.teamId;

    if (!teamId) {
        return formatResponse(400, { message: "Missing teamId in path parameters" });
    }

    try {
        console.log(`[INFO] [getHistory] Fetching history for team: ${teamId}`);
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Failed to fetch progress history", error);
        return formatResponse(500, { message: "Internal server error" });
    }
};
