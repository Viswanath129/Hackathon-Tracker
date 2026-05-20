const progressService = require("../services/progressService");

const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

/**
 * Helper to parse Lambda event body.
 * Supports both pre-parsed objects and stringified JSON.
 */
const parseBody = (event) => {
    if (!event.body) return {};
    if (typeof event.body === "object") return event.body;
    try {
        return JSON.parse(event.body);
    } catch (e) {
        console.error("Failed to parse body:", e);
        return {};
    }
};

/**
 * Lambda handler to log a progress update.
 * POST /api/progress/update
 */
exports.logUpdate = async (event) => {
    try {
        const body = parseBody(event);
        const { projectId, updateText, deltaPercentage } = body;

        if (!projectId || !updateText) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "projectId and updateText are required fields." })
            };
        }

        // Validation: deltaPercentage must be numeric between 0 and 100 if provided
        if (deltaPercentage !== undefined) {
            const delta = parseFloat(deltaPercentage);
            if (isNaN(delta) || delta < 0 || delta > 100) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: "deltaPercentage must be a numeric value between 0 and 100." })
                };
            }
        }

        const result = await progressService.logProgress(projectId, updateText, deltaPercentage);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error("logUpdate Handler Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "An internal error occurred while logging progress." })
        };
    }
};

/**
 * Lambda handler to retrieve progress history for a team/project.
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    try {
        const projectId = event.pathParameters?.teamId;

        if (!projectId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "teamId path parameter is required." })
            };
        }

        const logs = await progressService.getProgressLogs(projectId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error("getHistory Handler Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "An internal error occurred while fetching progress history." })
        };
    }
};
