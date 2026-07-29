const { logProgress, getProgressLogs } = require("../services/progressService");
const { validateProgressInput } = require("../utils/validation");
const { formatResponse } = require("./utils");

/**
 * Log a progress update for a project (Team)
 * Expected payload: { teamId, updateText, deltaPercentage }
 * Maps 'teamId' to 'projectId' in the progress service.
 */
const logUpdate = async (event) => {
    try {
        console.log("[INFO] [logUpdate] Starting logUpdate handler");
        if (!event || !event.body) {
            console.error("[ERROR] [logUpdate] Missing request body");
            return formatResponse(400, { message: "Missing request body" });
        }

        let body;
        if (typeof event.body === "string") {
            try {
                body = JSON.parse(event.body);
            } catch (err) {
                console.error("[ERROR] [logUpdate] JSON parsing failed", err);
                return formatResponse(400, { message: "Invalid JSON format" });
            }
        } else {
            body = event.body;
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            console.error(`[ERROR] [logUpdate] Validation failed: ${validation.message}`);
            return formatResponse(400, { message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = body;
        console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);

        // Persist update in DynamoDB via service layer
        await logProgress(teamId, updateText, deltaPercentage);

        return formatResponse(201, { message: "Progress logged successfully" });
    } catch (error) {
        console.error("[ERROR] [logUpdate] Internal Server Error:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * Get history of progress logs for a project (Team)
 * Expected path parameters: { teamId }
 * Maps 'teamId' to 'projectId' in the progress service.
 */
const getHistory = async (event) => {
    try {
        console.log("[INFO] [getHistory] Starting getHistory handler");
        const teamId = event?.pathParameters?.teamId;
        if (!teamId) {
            console.error("[ERROR] [getHistory] Missing teamId parameter");
            return formatResponse(400, { message: "Missing teamId" });
        }

        console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);
        const logs = await getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Internal Server Error:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
