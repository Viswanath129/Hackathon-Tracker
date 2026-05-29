const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
const logUpdate = async (event) => {
    try {
        let body;
        try {
            body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return formatResponse(400, { message: "Invalid JSON in request body" });
        }

        if (!body || !body.teamId) {
            return formatResponse(400, { message: "Missing required field: teamId" });
        }

        const { teamId, updateText, deltaPercentage } = body;
        console.log(`[INFO] [logUpdate] Processing update for teamId: ${teamId}`);

        if (deltaPercentage !== undefined) {
            const delta = Number(deltaPercentage);
            if (isNaN(delta) || delta < 0 || delta > 100) {
                return formatResponse(400, { message: "deltaPercentage must be a numeric value between 0 and 100" });
            }
        }

        const result = await logProgress(teamId, updateText || "", deltaPercentage || 0);
        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] [logUpdate]", error);
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
            return formatResponse(400, { message: "Missing teamId in path parameters" });
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
