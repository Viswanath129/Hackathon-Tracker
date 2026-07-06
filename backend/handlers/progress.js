const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    try {
        if (!event.body) {
            return formatResponse(400, { message: "Request body is missing" });
        }

        const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        const { teamId, updateText, deltaPercentage } = body;

        // Validation
        if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
            return formatResponse(400, { message: "teamId is required and must be a non-empty string" });
        }
        if (!updateText || typeof updateText !== "string" || updateText.trim() === "") {
            return formatResponse(400, { message: "updateText is required and must be a non-empty string" });
        }

        const deltaNum = Number(deltaPercentage);
        if (isNaN(deltaNum) || deltaNum < -100 || deltaNum > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a number between -100 and 100" });
        }

        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);

        await logProgress(teamId, updateText, deltaNum);

        return formatResponse(201, { message: "Progress logged successfully" });
    } catch (error) {
        console.error("[ERROR] [logUpdate]", error.message);
        if (error instanceof SyntaxError) {
            return formatResponse(400, { message: "Invalid JSON in request body" });
        }
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    try {
        const teamId = event.pathParameters ? event.pathParameters.teamId : null;

        if (!teamId) {
            return formatResponse(400, { message: "teamId path parameter is required" });
        }

        console.log(`[INFO] [getHistory] Fetching history for team: ${teamId}`);

        const logs = await getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory]", error.message);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};
