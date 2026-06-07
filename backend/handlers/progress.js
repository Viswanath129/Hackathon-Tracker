const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Request received", {
        body: event.body ? (typeof event.body === 'string' ? 'string' : 'object') : 'empty'
    });

    try {
        let body;
        if (typeof event.body === "string") {
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                return formatResponse(400, { message: "Invalid JSON in request body" });
            }
        } else {
            body = event.body;
        }

        const { teamId, updateText, deltaPercentage } = body || {};

        if (!teamId || !updateText || deltaPercentage === undefined) {
            return formatResponse(400, { message: "Missing required fields: teamId, updateText, deltaPercentage" });
        }

        const parsedDelta = parseFloat(deltaPercentage);
        if (isNaN(parsedDelta) || parsedDelta < 0 || parsedDelta > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a numeric value between 0 and 100" });
        }

        // teamId maps to projectId in the service layer (PROJ#<id>)
        const result = await logProgress(teamId, updateText, parsedDelta);

        console.log(`[INFO] [logUpdate] Progress logged for team ${teamId}`);
        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] [logUpdate]", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;

    console.log(`[INFO] [getHistory] Fetching history for team ${teamId}`);

    if (!teamId) {
        return formatResponse(400, { message: "Missing teamId in path" });
    }

    try {
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory]", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};
