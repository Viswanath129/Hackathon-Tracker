const { formatResponse } = require("./utils");
const progressService = require("../services/progressService");

/**
 * Handler for POST /api/progress/update
 */
const logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Request received");
    try {
        let body;
        try {
            body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        } catch (e) {
            console.error("[ERROR] [logUpdate] JSON parse error:", e);
            return formatResponse(400, { message: "Invalid JSON in request body" });
        }

        if (!body) {
            return formatResponse(400, { message: "Request body is empty" });
        }

        const { teamId, updateText, deltaPercentage } = body;

        if (!teamId || !updateText || deltaPercentage === undefined) {
            return formatResponse(400, { message: "Missing required fields: teamId, updateText, deltaPercentage" });
        }

        const parsedDelta = parseFloat(deltaPercentage);
        if (isNaN(parsedDelta) || parsedDelta < -100 || parsedDelta > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a numeric value between -100 and 100" });
        }

        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await progressService.logProgress(teamId, updateText, parsedDelta);

        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] [logUpdate] unexpected error:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * Handler for GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    console.log("[INFO] [getHistory] Request received");
    try {
        const teamId = event.pathParameters?.teamId;

        if (!teamId) {
            return formatResponse(400, { message: "Missing teamId in path parameters" });
        }

        console.log(`[INFO] [getHistory] Fetching history for team: ${teamId}`);
        const logs = await progressService.getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] unexpected error:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
