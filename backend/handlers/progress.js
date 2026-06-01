const { logProgress, getProgressLogs } = require("../services/progressService");
const { formatResponse } = require("./utils");

/**
 * Lambda handler to log a progress update.
 * Expected body: { teamId: string, updateText: string, deltaPercentage: number }
 */
const logUpdate = async (event) => {
    try {
        let body;
        if (typeof event.body === "string") {
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                return formatResponse(400, { message: "Invalid JSON in request body" });
            }
        } else {
            body = event.body || {};
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Selective logging for traceability without leaking full event
        console.log(`[INFO] [logUpdate] Processing update for teamId: ${teamId}`);

        if (!teamId || !updateText || deltaPercentage === undefined) {
            return formatResponse(400, { message: "Missing required fields: teamId, updateText, deltaPercentage" });
        }

        const parsedDelta = parseFloat(deltaPercentage);
        if (isNaN(parsedDelta) || parsedDelta < 0 || parsedDelta > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a number between 0 and 100" });
        }

        const result = await logProgress(teamId, updateText, parsedDelta);
        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] [logUpdate]", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * Lambda handler to get progress history.
 * Path parameter: teamId
 */
const getHistory = async (event) => {
    try {
        const teamId = event.pathParameters?.teamId;
        console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);

        if (!teamId) {
            return formatResponse(400, { message: "Missing teamId path parameter" });
        }

        const logs = await getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory]", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
