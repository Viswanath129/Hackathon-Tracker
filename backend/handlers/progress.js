const progressService = require("../services/progressService");
const { validateProgressInput } = require("../utils/validation");
const { formatResponse } = require("./utils");

/**
 * Log a progress update for a project
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Starting progress log update handler");

    try {
        if (!event || !event.body) {
            console.log("[ERROR] [logUpdate] Missing request body");
            return formatResponse(400, { message: "Request body is missing" });
        }

        let body;
        if (typeof event.body === "string") {
            try {
                body = JSON.parse(event.body);
            } catch (err) {
                console.log("[ERROR] [logUpdate] Failed to parse JSON body");
                return formatResponse(400, { message: "Invalid JSON format" });
            }
        } else {
            body = event.body;
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            console.log(`[WARN] [logUpdate] Validation failed: ${validation.error}`);
            return formatResponse(400, { message: validation.error });
        }

        const { teamId, updateText, deltaPercentage } = body;
        console.log(`[INFO] [logUpdate] Logging progress update for teamId: ${teamId}`);

        await progressService.logProgress(teamId, updateText, deltaPercentage);

        console.log(`[INFO] [logUpdate] Successfully logged progress for teamId: ${teamId}`);
        return formatResponse(201, { message: "Progress logged successfully" });

    } catch (err) {
        console.error("[ERROR] [logUpdate] Detailed error:", err);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * Get progress logs history for a project
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    console.log("[INFO] [getHistory] Starting progress history retrieval handler");

    try {
        const teamId = event && event.pathParameters ? event.pathParameters.teamId : null;
        if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
            console.log("[ERROR] [getHistory] Missing or invalid teamId parameter");
            return formatResponse(400, { message: "teamId parameter is required" });
        }

        console.log(`[INFO] [getHistory] Retrieving history for teamId: ${teamId}`);

        const logs = await progressService.getProgressLogs(teamId);

        console.log(`[INFO] [getHistory] Successfully retrieved history for teamId: ${teamId}`);
        return formatResponse(200, logs);

    } catch (err) {
        console.error("[ERROR] [getHistory] Detailed error:", err);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
