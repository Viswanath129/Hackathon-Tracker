const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Received progress update request");

    if (!event.body) {
        console.warn("[WARN] [logUpdate] Missing request body");
        return formatResponse(400, { error: "Missing request body" });
    }

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (error) {
        console.error("[ERROR] [logUpdate] JSON parse error:", error.message);
        return formatResponse(400, { error: "Invalid JSON format" });
    }

    const { teamId, updateText, deltaPercentage } = body;

    // Validation
    if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
        return formatResponse(400, { error: "teamId must be a non-empty string" });
    }
    if (!updateText || typeof updateText !== "string" || updateText.trim() === "") {
        return formatResponse(400, { error: "updateText must be a non-empty string" });
    }

    const delta = Number(deltaPercentage);
    if (isNaN(delta) || delta < -100 || delta > 100) {
        return formatResponse(400, { error: "deltaPercentage must be a number between -100 and 100" });
    }

    try {
        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await logProgress(teamId, updateText, delta);
        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] [logUpdate] Failed to log progress:", error.message);
        return formatResponse(500, { error: "Internal Server Error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;
    console.log(`[INFO] [getHistory] Fetching progress history for team: ${teamId}`);

    if (!teamId) {
        return formatResponse(400, { error: "teamId path parameter is required" });
    }

    try {
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, { logs });
    } catch (error) {
        console.error("[ERROR] [getHistory] Failed to fetch progress logs:", error.message);
        return formatResponse(500, { error: "Internal Server Error" });
    }
};
