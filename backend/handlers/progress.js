const progressService = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
const logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Starting progress log update");

    let body;
    try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (error) {
        console.error("[ERROR] [logUpdate] Failed to parse request body:", error);
        return formatResponse(400, { message: "Invalid JSON in request body" });
    }

    if (!body) {
        return formatResponse(400, { message: "Request body is missing" });
    }

    const { teamId, updateText, deltaPercentage } = body;

    if (!teamId || !updateText || deltaPercentage === undefined) {
        return formatResponse(400, { message: "Missing required fields: teamId, updateText, or deltaPercentage" });
    }

    const percentage = parseFloat(deltaPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        return formatResponse(400, { message: "deltaPercentage must be a numeric value between 0 and 100" });
    }

    try {
        console.log(`[INFO] [logUpdate] Logging update for teamId: ${teamId}`);
        const result = await progressService.logProgress(teamId, updateText, percentage);
        return formatResponse(201, {
            message: "Progress update logged successfully",
            ...result
        });
    } catch (error) {
        console.error("[ERROR] [logUpdate] Error logging progress:", error);
        return formatResponse(500, { message: "Internal server error while logging progress" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const teamId = event.pathParameters ? event.pathParameters.teamId : null;

    console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);

    if (!teamId) {
        return formatResponse(400, { message: "teamId path parameter is required" });
    }

    try {
        const logs = await progressService.getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Error fetching progress logs:", error);
        return formatResponse(500, { message: "Internal server error while fetching progress history" });
    }
};

module.exports = { logUpdate, getHistory };
