const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * Lambda handler for logging a progress update.
 * POST /api/progress/update
 */
exports.logUpdate = async (event) => {
    try {
        console.log("[INFO] [logUpdate] Processing progress log update");

        if (!event.body) {
            return formatResponse(400, { message: "Request body is missing" });
        }

        let body;
        try {
            body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        } catch (parseError) {
            console.error("[ERROR] [logUpdate] Failed to parse request body:", parseError);
            return formatResponse(400, { message: "Invalid JSON in request body" });
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Strict validation
        if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
            return formatResponse(400, { message: "teamId must be a non-empty string" });
        }
        if (!updateText || typeof updateText !== "string" || updateText.trim() === "") {
            return formatResponse(400, { message: "updateText must be a non-empty string" });
        }

        const numericDelta = Number(deltaPercentage);
        if (isNaN(numericDelta) || numericDelta < -100 || numericDelta > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a numeric value between -100 and 100" });
        }

        console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);
        const result = await logProgress(teamId, updateText, numericDelta);

        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] [logUpdate] Error logging update:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * Lambda handler for retrieving progress history.
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    try {
        const teamId = event.pathParameters?.teamId;

        if (!teamId) {
            return formatResponse(400, { message: "teamId path parameter is missing" });
        }

        console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);
        const logs = await getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Error fetching history:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};
