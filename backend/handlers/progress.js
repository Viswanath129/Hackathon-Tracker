const { logProgress, getProgressLogs } = require("../services/progressService");
const { validateProgressInput } = require("../utils/validation");
const { formatResponse } = require("./utils");

/**
 * Log a progress update for a project (Team)
 * AWS Lambda handler (POST /api/progress/update)
 */
const logUpdate = async (event) => {
    try {
        if (!event || !event.body) {
            console.error("[ERROR] [logUpdate] Request body is missing");
            return formatResponse(400, { error: "Request body is missing" });
        }

        let body;
        try {
            body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        } catch (jsonErr) {
            console.error("[ERROR] [logUpdate] JSON parsing failed:", jsonErr.message);
            return formatResponse(400, { error: "Invalid JSON format" });
        }

        if (!body) {
            console.error("[ERROR] [logUpdate] Parsed body is null or undefined");
            return formatResponse(400, { error: "Request body is missing" });
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Structured selective logging (avoiding printing full event object to prevent leaks)
        console.log(`[INFO] [logUpdate] Parsed teamId: ${teamId}`);

        const validationResult = validateProgressInput(teamId, updateText, deltaPercentage);
        if (!validationResult.valid) {
            console.warn(`[WARN] [logUpdate] Validation failed: ${validationResult.message}`);
            return formatResponse(400, { error: validationResult.message });
        }

        // Map teamId to projectId in progressService
        const result = await logProgress(teamId, updateText, deltaPercentage);
        console.log(`[INFO] [logUpdate] Progress successfully logged for teamId: ${teamId}`);

        return formatResponse(201, { success: true, timestamp: result.timestamp });
    } catch (error) {
        // Log detailed error to console, but return a generic message via formatResponse
        console.error("[ERROR] [logUpdate] Lambda execution failed:", error);
        return formatResponse(500);
    }
};

/**
 * Retrieve progress history for a project (Team)
 * AWS Lambda handler (GET /api/progress/{teamId})
 */
const getHistory = async (event) => {
    try {
        const teamId = event?.pathParameters?.teamId;

        // Structured selective logging
        console.log(`[INFO] [getHistory] Parsed teamId: ${teamId}`);

        if (!teamId || teamId.trim() === "") {
            console.warn("[WARN] [getHistory] Missing or empty teamId parameter");
            return formatResponse(400, { error: "teamId parameter is required" });
        }

        // Map teamId to projectId in progressService
        const logs = await getProgressLogs(teamId);
        console.log(`[INFO] [getHistory] Retrieved ${logs.length} logs for teamId: ${teamId}`);

        return formatResponse(200, logs);
    } catch (error) {
        // Log detailed error to console, but return a generic message via formatResponse
        console.error("[ERROR] [getHistory] Lambda execution failed:", error);
        return formatResponse(500);
    }
};

module.exports = { logUpdate, getHistory };
