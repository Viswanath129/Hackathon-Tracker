const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * [POST] /api/progress/update
 * Logs a progress update for a project.
 */
const logUpdate = async (event) => {
    try {
        const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

        if (!body) {
            return formatResponse(400, { message: "Invalid request body" });
        }

        const { teamId, updateText, deltaPercentage } = body;

        if (!teamId || !updateText || deltaPercentage === undefined) {
            return formatResponse(400, { message: "Missing required fields: teamId, updateText, deltaPercentage" });
        }

        const delta = parseFloat(deltaPercentage);
        if (isNaN(delta) || delta < 0 || delta > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a numeric value between 0 and 100" });
        }

        console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);
        const result = await logProgress(teamId, updateText, delta);

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
 * [GET] /api/progress/{teamId}
 * Retrieves progress history for a project.
 */
const getHistory = async (event) => {
    try {
        const { teamId } = event.pathParameters || {};

        if (!teamId) {
            return formatResponse(400, { message: "teamId is required in path parameters" });
        }

        console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);
        const logs = await getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory]", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
