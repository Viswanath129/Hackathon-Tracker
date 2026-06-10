const { formatResponse } = require("./utils");
const progressService = require("../services/progressService");

/**
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Request received");

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (error) {
        console.error("[ERROR] [logUpdate] Malformed JSON:", error);
        return formatResponse(400, { message: "Invalid JSON format in request body" });
    }

    if (!body) {
        return formatResponse(400, { message: "Request body is missing" });
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
        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await progressService.logProgress(teamId, updateText, delta);
        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] [logUpdate] Service Error:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;
    console.log(`[INFO] [getHistory] Fetching history for team: ${teamId}`);

    if (!teamId) {
        return formatResponse(400, { message: "teamId is required" });
    }

    try {
        const logs = await progressService.getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Service Error:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
