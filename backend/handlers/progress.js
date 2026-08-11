const { logProgress, getProgressLogs } = require("../services/progressService");
const dynamoService = require("../services/dynamoService");
const { formatResponse } = require("./utils");
const { validateProgressInput } = require("../utils/validation");

/**
 * Lambda handler for logging progress updates.
 * Route: POST /api/progress/update
 */
const logUpdate = async (event) => {
    try {
        if (!event || event.body === undefined || event.body === null) {
            console.log("[WARN] [logUpdate] Missing request body");
            return formatResponse(400, { message: "Required request body is missing" });
        }

        let body;
        try {
            body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        } catch (parseError) {
            console.log("[WARN] [logUpdate] JSON parsing failed");
            return formatResponse(400, { message: "Invalid JSON format" });
        }

        if (!body) {
            console.log("[WARN] [logUpdate] Parsed body is null or undefined");
            return formatResponse(400, { message: "Required request body is missing" });
        }

        console.log("[INFO] [logUpdate] Received progress update request for teamId:", body.teamId);

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            console.log("[WARN] [logUpdate] Input validation failed:", validation.message);
            return formatResponse(400, { message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = body;

        // BOLA / IDOR Authorization check via Cognito claims
        const claims = event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims;
        if (claims) {
            const email = claims.email;
            const user = await dynamoService.getUser(email);
            if (user && user.role !== "admin") {
                const allProjects = await dynamoService.getAllProjects();
                const project = allProjects.find(p => p._id === teamId);
                if (!project || project.team_id !== user._id) {
                    console.log("[WARN] [logUpdate] BOLA unauthorized access attempt by email:", email);
                    return formatResponse(403, { message: "Forbidden: You are not authorized for this project" });
                }
            }
        }

        await logProgress(teamId, updateText, deltaPercentage);

        console.log("[INFO] [logUpdate] Progress logged successfully for teamId:", teamId);
        return formatResponse(201, { message: "Progress logged successfully" });
    } catch (error) {
        console.error("[ERROR] [logUpdate] Unhandled internal server error:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * Lambda handler for retrieving progress update history.
 * Route: GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    try {
        const teamId = event && event.pathParameters && event.pathParameters.teamId;
        if (!teamId) {
            console.log("[WARN] [getHistory] Missing teamId path parameter");
            return formatResponse(400, { message: "teamId path parameter is required" });
        }

        console.log("[INFO] [getHistory] Querying progress history for teamId:", teamId);

        // BOLA / IDOR Authorization check via Cognito claims
        const claims = event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims;
        if (claims) {
            const email = claims.email;
            const user = await dynamoService.getUser(email);
            if (user && user.role !== "admin") {
                const allProjects = await dynamoService.getAllProjects();
                const project = allProjects.find(p => p._id === teamId);
                if (!project || project.team_id !== user._id) {
                    console.log("[WARN] [getHistory] BOLA unauthorized access attempt by email:", email);
                    return formatResponse(403, { message: "Forbidden: You are not authorized for this project" });
                }
            }
        }

        const logs = await getProgressLogs(teamId);

        console.log("[INFO] [getHistory] Successfully retrieved progress logs for teamId:", teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error("[ERROR] [getHistory] Unhandled internal server error:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
