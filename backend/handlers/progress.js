const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Starting progress update");

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (error) {
        console.error("[ERROR] [logUpdate] Failed to parse request body:", error);
        return formatResponse(400, { message: "Invalid JSON in request body" });
    }

    const { teamId, updateText, deltaPercentage } = body || {};

    if (!teamId || !updateText || deltaPercentage === undefined) {
        console.error("[ERROR] [logUpdate] Missing required fields:", { teamId, updateText, deltaPercentage });
        return formatResponse(400, { message: "Missing required fields: teamId, updateText, deltaPercentage" });
    }

    const parsedDelta = parseFloat(deltaPercentage);
    if (isNaN(parsedDelta) || parsedDelta < -100 || parsedDelta > 100) {
        console.error("[ERROR] [logUpdate] Invalid deltaPercentage:", deltaPercentage);
        return formatResponse(400, { message: "deltaPercentage must be a number between -100 and 100" });
    }

    try {
        console.log("[INFO] [logUpdate] Logging progress for teamId:", teamId);
        const result = await logProgress(teamId, updateText, parsedDelta);
        return formatResponse(201, {
            message: "Progress logged successfully",
            ...result
        });
    } catch (error) {
        console.error("[ERROR] [logUpdate] Internal error:", error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    console.log("[INFO] [getHistory] Fetching progress history");

    const teamId = event.pathParameters ? event.pathParameters.teamId : null;

    if (!teamId) {
        console.error("[ERROR] [getHistory] Missing teamId in path");
        return formatResponse(400, { message: "Missing teamId in path" });
    }

    try {
        console.log("[INFO] [getHistory] Querying logs for teamId:", teamId);
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Internal error:", error);
        return formatResponse(500, { message: "Internal server error" });
    }
};
