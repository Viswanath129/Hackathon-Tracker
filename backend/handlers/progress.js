const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    console.log("[INFO] logUpdate event received");

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (error) {
        return formatResponse(400, { message: "Invalid JSON body" });
    }

    if (!body) {
        return formatResponse(400, { message: "Request body is missing" });
    }

    const { teamId, updateText, deltaPercentage } = body;

    // Strict validation
    if (typeof teamId !== "string" || teamId.trim() === "") {
        return formatResponse(400, { message: "teamId must be a non-empty string" });
    }
    if (typeof updateText !== "string" || updateText.trim() === "") {
        return formatResponse(400, { message: "updateText must be a non-empty string" });
    }

    const numericDelta = Number(deltaPercentage);
    if (isNaN(numericDelta) || numericDelta < -100 || numericDelta > 100) {
        return formatResponse(400, { message: "deltaPercentage must be a numeric value between -100 and 100" });
    }

    try {
        const result = await logProgress(teamId, updateText, numericDelta);
        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] logUpdate failed:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    console.log("[INFO] getHistory event received");

    const teamId = event.pathParameters?.teamId;

    if (!teamId) {
        return formatResponse(400, { message: "Missing teamId in path" });
    }

    try {
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] getHistory failed:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};
