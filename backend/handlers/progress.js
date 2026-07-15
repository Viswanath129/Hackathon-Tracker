const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");
const { validateProgressInput } = require("../utils/validation");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Request received");

    try {
        if (!event.body) {
            return formatResponse(400, { message: "Request body is missing" });
        }

        const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        const { teamId, updateText, deltaPercentage } = body;

        const validation = validateProgressInput(teamId, updateText, deltaPercentage);
        if (!validation.isValid) {
            return formatResponse(400, { message: validation.error });
        }

        console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);
        const result = await logProgress(teamId, updateText, validation.delta);

        return formatResponse(201, {
            message: "Progress logged successfully",
            ...result
        });
    } catch (error) {
        console.error("[ERROR] [logUpdate]", error);
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
    console.log("[INFO] [getHistory] Request received");

    try {
        const teamId = event.pathParameters ? event.pathParameters.teamId : null;

        if (!teamId) {
            return formatResponse(400, { message: "teamId path parameter is required" });
        }

        console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);
        const logs = await getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory]", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};
