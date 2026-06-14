const progressService = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
const logUpdate = async (event) => {
    try {
        const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

        if (!body) {
            return formatResponse(400, { message: "Invalid request body" });
        }

        const { teamId, updateText, deltaPercentage } = body;

        if (!teamId || !updateText) {
            return formatResponse(400, { message: "teamId and updateText are required" });
        }

        const parsedDelta = parseFloat(deltaPercentage);
        if (isNaN(parsedDelta) || parsedDelta < 0 || parsedDelta > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a number between 0 and 100" });
        }

        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await progressService.logProgress(teamId, updateText, parsedDelta);

        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] [logUpdate]", error);
        if (error instanceof SyntaxError) {
            return formatResponse(400, { message: "Malformed JSON in request body" });
        }
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    try {
        const teamId = event.pathParameters?.teamId;

        if (!teamId) {
            return formatResponse(400, { message: "teamId path parameter is required" });
        }

        console.log(`[INFO] [getHistory] Fetching history for team: ${teamId}`);
        const logs = await progressService.getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory]", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
