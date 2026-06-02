const { formatResponse } = require("./utils");
const progressService = require("../services/progressService");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
const logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Received progress update request");

    try {
        let body;
        if (typeof event.body === "string") {
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                console.error("[ERROR] [logUpdate] Malformed JSON in request body");
                return formatResponse(400, { message: "Invalid JSON format" });
            }
        } else {
            body = event.body || {};
        }

        const { teamId, updateText, deltaPercentage } = body;

        if (!teamId || !updateText || deltaPercentage === undefined) {
            console.warn("[WARN] [logUpdate] Missing required fields", { teamId, updateText, deltaPercentage });
            return formatResponse(400, { message: "teamId, updateText, and deltaPercentage are required" });
        }

        const parsedDelta = parseFloat(deltaPercentage);
        if (isNaN(parsedDelta) || parsedDelta < 0 || parsedDelta > 100) {
            console.warn("[WARN] [logUpdate] Invalid deltaPercentage:", deltaPercentage);
            return formatResponse(400, { message: "deltaPercentage must be a number between 0 and 100" });
        }

        // Map teamId to projectId for the service layer
        console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);
        const result = await progressService.logProgress(teamId, updateText, parsedDelta);

        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] [logUpdate] Internal Server Error:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;
    console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);

    if (!teamId) {
        console.warn("[WARN] [getHistory] Missing teamId path parameter");
        return formatResponse(400, { message: "teamId is required" });
    }

    try {
        const logs = await progressService.getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Internal Server Error:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
