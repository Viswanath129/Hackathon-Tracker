const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * Handler for logging progress updates
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Received progress update request");

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (error) {
        console.error("[ERROR] [logUpdate] Malformed JSON in request body", error);
        return formatResponse(400, { message: "Invalid JSON in request body" });
    }

    if (!body) {
        return formatResponse(400, { message: "Request body is missing" });
    }

    const { teamId, updateText, deltaPercentage } = body;

    // Validation
    if (!teamId) {
        console.warn("[WARN] [logUpdate] Missing teamId");
        return formatResponse(400, { message: "teamId is required" });
    }

    let delta = deltaPercentage;
    if (deltaPercentage !== undefined) {
        delta = parseFloat(deltaPercentage);
        if (isNaN(delta) || delta < 0 || delta > 100) {
            console.warn("[WARN] [logUpdate] Invalid deltaPercentage:", deltaPercentage);
            return formatResponse(400, { message: "deltaPercentage must be a numeric value between 0 and 100" });
        }
    }

    try {
        // Map teamId to projectId as per migration guidelines
        const result = await logProgress(teamId, updateText, delta);
        console.log(`[INFO] [logUpdate] Successfully logged progress for teamId: ${teamId}`);
        return formatResponse(201, result);
    } catch (error) {
        console.error(`[ERROR] [logUpdate] Failed to log progress for teamId: ${teamId}`, error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

/**
 * Handler for retrieving progress history
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;
    console.log(`[INFO] [getHistory] Fetching progress history for teamId: ${teamId}`);

    if (!teamId) {
        return formatResponse(400, { message: "teamId path parameter is required" });
    }

    try {
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error(`[ERROR] [getHistory] Failed to fetch progress history for teamId: ${teamId}`, error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

module.exports = { logUpdate, getHistory };
