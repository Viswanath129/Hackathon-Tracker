const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
const logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Received request");

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (error) {
        return formatResponse(400, { message: "Invalid JSON in request body" });
    }

    if (!body) {
        return formatResponse(400, { message: "Missing request body" });
    }

    const { teamId, updateText, deltaPercentage } = body;

    // Strict validation
    if (!teamId || typeof teamId !== "string" || teamId.trim() === "") {
        return formatResponse(400, { message: "teamId must be a non-empty string" });
    }
    if (!updateText || typeof updateText !== "string" || updateText.trim() === "") {
        return formatResponse(400, { message: "updateText must be a non-empty string" });
    }

    const delta = Number(deltaPercentage);
    if (isNaN(delta) || delta < -100 || delta > 100) {
        return formatResponse(400, { message: "deltaPercentage must be a number between -100 and 100" });
    }

    try {
        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await logProgress(teamId, updateText, delta);
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
    console.log("[INFO] [getHistory] Received request");

    const teamId = event.pathParameters?.teamId;

    if (!teamId) {
        return formatResponse(400, { message: "Missing teamId in path parameters" });
    }

    try {
        console.log(`[INFO] [getHistory] Fetching progress logs for team: ${teamId}`);
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory]", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
