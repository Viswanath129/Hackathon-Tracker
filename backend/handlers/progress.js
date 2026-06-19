const progressService = require("../services/progressService");
const { formatResponse } = require("./utils");

const logUpdate = async (event) => {
    try {
        console.log("[INFO] [logUpdate] Received progress update request");

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
        if (isNaN(parsedDelta) || parsedDelta < -100 || parsedDelta > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a number between -100 and 100" });
        }

        console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);
        const result = await progressService.logProgress(teamId, updateText, parsedDelta);

        return formatResponse(201, result);
    } catch (error) {
        console.error("[ERROR] [logUpdate]", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

const getHistory = async (event) => {
    try {
        console.log("[INFO] [getHistory] Received history request");
        const teamId = event.pathParameters?.teamId;

        if (!teamId) {
            return formatResponse(400, { message: "Missing teamId path parameter" });
        }

        console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);
        const logs = await progressService.getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory]", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
