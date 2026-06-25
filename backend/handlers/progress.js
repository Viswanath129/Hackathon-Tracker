const progressService = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Received event:", event.body);

    try {
        let body;
        if (typeof event.body === 'string') {
            body = JSON.parse(event.body);
        } else {
            body = event.body;
        }

        const { teamId, updateText, deltaPercentage } = body;

        if (!teamId || !updateText || deltaPercentage === undefined) {
            return formatResponse(400, { message: "Missing required fields: teamId, updateText, deltaPercentage" });
        }

        const parsedDelta = parseFloat(deltaPercentage);
        if (isNaN(parsedDelta) || parsedDelta < -100 || parsedDelta > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a numeric value between -100 and 100" });
        }

        const result = await progressService.logProgress(teamId, updateText, parsedDelta);

        return formatResponse(201, {
            message: "Progress logged successfully",
            timestamp: result.timestamp
        });

    } catch (error) {
        console.error("[ERROR] [logUpdate] Error logging progress:", error);
        if (error instanceof SyntaxError) {
            return formatResponse(400, { message: "Invalid JSON in request body" });
        }
        return formatResponse(500, { message: "Internal server error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    const teamId = event.pathParameters ? event.pathParameters.teamId : null;
    console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);

    if (!teamId) {
        return formatResponse(400, { message: "teamId is required" });
    }

    try {
        const logs = await progressService.getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Error fetching progress logs:", error);
        return formatResponse(500, { message: "Internal server error" });
    }
};
