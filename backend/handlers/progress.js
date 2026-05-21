const progressService = require("../services/progressService");

// Production-grade headers. Note: Access-Control-Allow-Origin should be restricted
// to specific domains in a real production environment (e.g., process.env.ALLOWED_ORIGIN).
const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
};

/**
 * Lambda handler for logging progress updates
 */
exports.logUpdate = async (event) => {
    console.log(`[INFO] [logUpdate] Received event: ${JSON.stringify(event)}`);

    try {
        let body;
        if (typeof event.body === "string") {
            body = JSON.parse(event.body);
        } else {
            body = event.body || {};
        }

        // teamId maps to projectId in the service layer
        const { teamId, updateText, deltaPercentage } = body;

        if (!teamId || !updateText) {
            console.warn(`[WARN] [logUpdate] Missing required fields in body: ${JSON.stringify(body)}`);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "Missing required fields: teamId and updateText are required." })
            };
        }

        // Validation for deltaPercentage if provided
        if (deltaPercentage !== undefined) {
            const delta = parseFloat(deltaPercentage);
            if (isNaN(delta) || delta < 0 || delta > 100) {
                console.warn(`[WARN] [logUpdate] Invalid deltaPercentage: ${deltaPercentage}`);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: "deltaPercentage must be a numeric value between 0 and 100." })
                };
            }
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);
        console.log(`[INFO] [logUpdate] Successfully logged progress for team: ${teamId}`);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error(`[ERROR] [logUpdate] Exception occurred: ${error.message}`, error.stack);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "Internal Server Error" })
        };
    }
};

/**
 * Lambda handler for retrieving progress history
 */
exports.getHistory = async (event) => {
    console.log(`[INFO] [getHistory] Received event: ${JSON.stringify(event)}`);

    try {
        const teamId = event.pathParameters ? event.pathParameters.teamId : null;

        if (!teamId) {
            console.warn("[WARN] [getHistory] Missing teamId in path parameters");
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "Missing teamId in path parameters." })
            };
        }

        const logs = await progressService.getProgressLogs(teamId);
        console.log(`[INFO] [getHistory] Successfully retrieved ${logs.length} logs for team: ${teamId}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error(`[ERROR] [getHistory] Exception occurred: ${error.message}`, error.stack);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "Internal Server Error" })
        };
    }
};
