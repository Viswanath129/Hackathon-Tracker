const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Received progress update request");

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (error) {
        console.error("[ERROR] [logUpdate] Failed to parse request body", error);
        return formatResponse(400, { message: "Invalid JSON in request body" });
    }

    if (!body) {
        console.error("[ERROR] [logUpdate] Request body is missing");
        return formatResponse(400, { message: "Request body is missing" });
    }

    const { teamId, updateText, deltaPercentage } = body;

    // Validation
    if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
        console.error("[ERROR] [logUpdate] Validation failed: teamId is required");
        return formatResponse(400, { message: "teamId must be a non-empty string" });
    }

    if (!updateText || typeof updateText !== "string" || updateText.trim() === "") {
        console.error("[ERROR] [logUpdate] Validation failed: updateText is required");
        return formatResponse(400, { message: "updateText must be a non-empty string" });
    }

    const delta = Number(deltaPercentage);
    if (isNaN(delta) || delta < -100 || delta > 100) {
        console.error("[ERROR] [logUpdate] Validation failed: invalid deltaPercentage", deltaPercentage);
        return formatResponse(400, { message: "deltaPercentage must be a number between -100 and 100" });
    }

    try {
        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await logProgress(teamId, updateText, delta);
        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] [logUpdate] Internal server error", error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    const teamId = event.pathParameters ? event.pathParameters.teamId : null;
    console.log(`[INFO] [getHistory] Fetching history for team: ${teamId}`);

    if (!teamId) {
        console.error("[ERROR] [getHistory] teamId is missing in path parameters");
        return formatResponse(400, { message: "teamId path parameter is required" });
    }

    try {
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Internal server error", error);
        return formatResponse(500, { message: "Internal server error" });
    }
};
