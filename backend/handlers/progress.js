const { formatResponse } = require("./utils");
const { validateProgressInput } = require("../utils/validation");
const { logProgress, getProgressLogs } = require("../services/progressService");

/**
 * Lambda handler for logging progress update.
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    try {
        console.log("[INFO] [logUpdate] Handler invoked");

        if (!event || !event.body) {
            console.error("[ERROR] [logUpdate] Missing request body");
            return formatResponse(400, { message: "Bad Request: Missing request body" });
        }

        let body;
        if (typeof event.body === "string") {
            try {
                body = JSON.parse(event.body);
            } catch (err) {
                console.error("[ERROR] [logUpdate] Failed to parse JSON body", err);
                return formatResponse(400, { message: "Bad Request: Invalid JSON" });
            }
        } else {
            body = event.body;
        }

        const { teamId, updateText, deltaPercentage } = body || {};

        // Selective logging to avoid PII or secret leaks
        console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);

        const validation = validateProgressInput({ teamId, updateText, deltaPercentage });
        if (!validation.valid) {
            console.warn(`[WARN] [logUpdate] Validation failed: ${validation.message}`);
            return formatResponse(400, { message: validation.message });
        }

        await logProgress(teamId, updateText, Number(deltaPercentage));

        console.log(`[INFO] [logUpdate] Progress successfully logged for teamId: ${teamId}`);
        return formatResponse(201, { message: "Created", success: true });
    } catch (error) {
        console.error("[ERROR] [logUpdate] Internal Server Error:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * Lambda handler for retrieving progress history.
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    try {
        console.log("[INFO] [getHistory] Handler invoked");

        const teamId = event.pathParameters && event.pathParameters.teamId;
        if (!teamId) {
            console.warn("[WARN] [getHistory] Missing teamId path parameter");
            return formatResponse(400, { message: "Bad Request: Missing teamId parameter" });
        }

        console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);

        const logs = await getProgressLogs(teamId);

        console.log(`[INFO] [getHistory] Progress history retrieved for teamId: ${teamId}`);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Internal Server Error:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
