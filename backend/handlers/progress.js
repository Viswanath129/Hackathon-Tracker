const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * Handler for logging project progress updates.
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    try {
        let body;
        if (typeof event.body === "string") {
            try {
                body = JSON.parse(event.body);
            } catch (err) {
                console.error("[ERROR] [logUpdate] Failed to parse event body", err);
                return formatResponse(400, { message: "Invalid JSON in request body" });
            }
        } else {
            body = event.body;
        }

        const { teamId, updateText, deltaPercentage } = body || {};

        if (!teamId || !updateText || deltaPercentage === undefined) {
            return formatResponse(400, { message: "Missing required fields: teamId, updateText, deltaPercentage" });
        }

        const delta = parseFloat(deltaPercentage);
        if (isNaN(delta) || delta < 0 || delta > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a numeric value between 0 and 100" });
        }

        console.info(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await logProgress(teamId, updateText, delta);

        return formatResponse(200, {
            message: "Progress log created successfully",
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error("[ERROR] [logUpdate] Unhandled exception", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * Handler for retrieving progress history for a project.
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    try {
        const { teamId } = event.pathParameters || {};

        if (!teamId) {
            return formatResponse(400, { message: "Missing teamId path parameter" });
        }

        console.info(`[INFO] [getHistory] Fetching progress history for team: ${teamId}`);
        const logs = await getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Unhandled exception", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
