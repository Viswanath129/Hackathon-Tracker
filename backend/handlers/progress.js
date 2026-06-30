const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
const logUpdate = async (event) => {
    try {
        if (!event.body) {
            return formatResponse(400, { message: "Request body is missing" });
        }

        const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        const { teamId, updateText, deltaPercentage } = body;

        // Validation
        if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
            return formatResponse(400, { message: "teamId must be a non-empty string" });
        }
        if (!updateText || typeof updateText !== "string" || updateText.trim() === "") {
            return formatResponse(400, { message: "updateText must be a non-empty string" });
        }

        const delta = Number(deltaPercentage);
        if (isNaN(delta) || delta < -100 || delta > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a numeric value between -100 and 100" });
        }

        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await logProgress(teamId, updateText, delta);

        return formatResponse(201, {
            message: "Progress logged successfully",
            ...result
        });
    } catch (error) {
        console.error("[ERROR] [logUpdate]", error);
        if (error instanceof SyntaxError) {
            return formatResponse(400, { message: "Invalid JSON in request body" });
        }
        return formatResponse(500, { message: "Internal server error" });
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
        const logs = await getProgressLogs(teamId);

        return formatResponse(200, {
            teamId,
            logs
        });
    } catch (error) {
        console.error("[ERROR] [getHistory]", error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

module.exports = { logUpdate, getHistory };
