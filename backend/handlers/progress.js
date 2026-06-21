const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
const logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Received progress update request");

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (error) {
        return formatResponse(400, { message: "Invalid JSON in request body" });
    }

    const { teamId, updateText, deltaPercentage } = body || {};

    if (!teamId || !updateText || deltaPercentage === undefined) {
        return formatResponse(400, { message: "Missing required fields: teamId, updateText, deltaPercentage" });
    }

    const parsedDelta = parseFloat(deltaPercentage);
    if (isNaN(parsedDelta) || parsedDelta < -100 || parsedDelta > 100) {
        return formatResponse(400, { message: "deltaPercentage must be a number between -100 and 100" });
    }

    try {
        // In the service layer, teamId is mapped to projectId for DynamoDB PK
        const result = await logProgress(teamId, updateText, parsedDelta);
        return formatResponse(201, {
            message: "Progress logged successfully",
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error("[ERROR] [logUpdate]", error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;

    if (!teamId) {
        return formatResponse(400, { message: "Missing teamId parameter" });
    }

    console.log(`[INFO] [getHistory] Fetching history for team: ${teamId}`);

    try {
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory]", error);
        return formatResponse(500, { message: "Internal server error" });
    }
};

module.exports = { logUpdate, getHistory };
