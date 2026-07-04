const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Handler for logging project progress updates.
 */
const logUpdate = async (event) => {
    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (e) {
        console.error("[ERROR] [logUpdate] Failed to parse request body", e);
        return formatResponse(400, { message: "Invalid JSON in request body" });
    }

    if (!body) {
        return formatResponse(400, { message: "Request body is missing" });
    }

    const { teamId, updateText, deltaPercentage } = body;

    // Validation as per specifications
    if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
        return formatResponse(400, { message: "teamId must be a non-empty string" });
    }

    if (!updateText || typeof updateText !== "string" || updateText.trim() === "") {
        return formatResponse(400, { message: "updateText must be a non-empty string" });
    }

    const delta = Number(deltaPercentage);
    if (isNaN(delta) || delta < -100 || delta > 100) {
        return formatResponse(400, { message: "deltaPercentage must be a number between -100 and 100" });
    }

    try {
        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await logProgress(teamId, updateText, delta);
        return formatResponse(201, result);
    } catch (error) {
        console.error(`[ERROR] [logUpdate] Error logging progress for team ${teamId}:`, error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

/**
 * GET /api/progress/{teamId}
 * Handler for retrieving progress history for a team.
 */
const getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;

    if (!teamId) {
        return formatResponse(400, { message: "teamId path parameter is required" });
    }

    try {
        console.log(`[INFO] [getHistory] Fetching progress history for team: ${teamId}`);
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error(`[ERROR] [getHistory] Error fetching progress for team ${teamId}:`, error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

module.exports = { logUpdate, getHistory };
