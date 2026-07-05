const progressService = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Received progress update request");

    try {
        if (!event.body) {
            return formatResponse(400, { message: "Request body is missing" });
        }

        const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        const { teamId, updateText, deltaPercentage } = body;

        // Validation
        if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
            return formatResponse(400, { message: "Invalid or missing teamId" });
        }
        if (!updateText || typeof updateText !== "string" || updateText.trim() === "") {
            return formatResponse(400, { message: "Invalid or missing updateText" });
        }

        const delta = Number(deltaPercentage);
        if (isNaN(delta) || delta < -100 || delta > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a number between -100 and 100" });
        }

        console.log(`[INFO] [logUpdate] Logging update for team: ${teamId}`);
        const result = await progressService.logProgress(teamId, updateText, delta);

        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] [logUpdate] Failed to log progress:", error);
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
    const teamId = event.pathParameters?.teamId;
    console.log(`[INFO] [getHistory] Fetching history for team: ${teamId}`);

    if (!teamId) {
        return formatResponse(400, { message: "teamId is required in path parameters" });
    }

    try {
        const logs = await progressService.getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Failed to fetch history:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};
