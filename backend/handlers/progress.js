const { formatResponse } = require("./utils");
const { logProgress, getProgressLogs } = require("../services/progressService");
const dynamoService = require("../services/dynamoService");
const { validateProgressInput } = require("../utils/validation");
const jwt = require("jsonwebtoken");

/**
 * Helper to authenticate user from Lambda event headers.
 * Validates JWT using JWT_SECRET, handles user lookups, and fails securely if unconfigured.
 */
const getAuthenticatedUser = async (event) => {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw { statusCode: 401, message: "Not authorized, no token" };
    }

    const token = authHeader.split(" ")[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.trim() === "") {
        console.error("[ERROR] [getAuthenticatedUser] JWT_SECRET is not configured or empty.");
        throw { statusCode: 500, message: "Internal Server Error" };
    }

    let decoded;
    try {
        decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
        console.error("[ERROR] [getAuthenticatedUser] Token verification failed:", err.message);
        throw { statusCode: 401, message: "Not authorized, token failed" };
    }

    let user = await dynamoService.getUser(decoded.email);
    if (!user) {
        const allUsers = await dynamoService.getAllUsers();
        user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
    }

    if (!user) {
        throw { statusCode: 401, message: "User not found in cloud" };
    }

    return user;
};

/**
 * POST /api/progress/update
 * Event-driven AWS Lambda handler for logging progress update.
 */
const logUpdate = async (event) => {
    console.log("[INFO] [logUpdate] Executing logUpdate handler.");

    try {
        if (!event.body) {
            console.warn("[WARN] [logUpdate] Missing request body.");
            return formatResponse(400, { message: "Request body is missing" });
        }

        let data;
        try {
            data = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        } catch (err) {
            console.error("[ERROR] [logUpdate] JSON parsing failed:", err.message);
            return formatResponse(400, { message: "Invalid JSON format" });
        }

        const validationResult = validateProgressInput(data);
        if (!validationResult.isValid) {
            console.warn("[WARN] [logUpdate] Input validation failed:", validationResult.error);
            return formatResponse(400, { message: validationResult.error });
        }

        const { teamId, updateText, deltaPercentage } = data;
        // Structured logging focusing only on non-PII, selective identifiers like teamId
        console.log(`[INFO] [logUpdate] Processing update for teamId: ${teamId}`);

        // Authenticate user
        let user;
        try {
            user = await getAuthenticatedUser(event);
        } catch (authErr) {
            console.warn("[WARN] [logUpdate] User authentication failed:", authErr.message || authErr);
            if (authErr.statusCode === 500) {
                return formatResponse(500, { message: "Internal Server Error" });
            }
            return formatResponse(authErr.statusCode || 401, { message: authErr.message || "Unauthorized" });
        }

        // Fetch project for BOLA verification
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            console.warn(`[WARN] [logUpdate] Project with ID ${teamId} not found.`);
            return formatResponse(404, { message: "Project not found" });
        }

        // BOLA Verification
        if (user.role !== "admin" && project.team_id !== user._id) {
            console.warn(`[WARN] [logUpdate] BOLA violation: user ${user.email} is unauthorized to update project ${teamId}`);
            return formatResponse(403, { message: "Forbidden: You do not own this project" });
        }

        // Save progress log
        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        console.log(`[INFO] [logUpdate] Successfully saved progress log for teamId: ${teamId}`);

        return formatResponse(201, result);

    } catch (error) {
        console.error("[ERROR] [logUpdate] Unhandled exception in handler:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * GET /api/progress/{teamId}
 * Event-driven AWS Lambda handler for retrieving progress history.
 */
const getHistory = async (event) => {
    console.log("[INFO] [getHistory] Executing getHistory handler.");

    try {
        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            console.warn("[WARN] [getHistory] Missing teamId path parameter.");
            return formatResponse(400, { message: "teamId is required" });
        }

        console.log(`[INFO] [getHistory] Processing history retrieval for teamId: ${teamId}`);

        // Authenticate user
        let user;
        try {
            user = await getAuthenticatedUser(event);
        } catch (authErr) {
            console.warn("[WARN] [getHistory] User authentication failed:", authErr.message || authErr);
            if (authErr.statusCode === 500) {
                return formatResponse(500, { message: "Internal Server Error" });
            }
            return formatResponse(authErr.statusCode || 401, { message: authErr.message || "Unauthorized" });
        }

        // Fetch project for BOLA verification
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            console.warn(`[WARN] [getHistory] Project with ID ${teamId} not found.`);
            return formatResponse(404, { message: "Project not found" });
        }

        // BOLA Verification
        if (user.role !== "admin" && project.team_id !== user._id) {
            console.warn(`[WARN] [getHistory] BOLA violation: user ${user.email} is unauthorized to view history of project ${teamId}`);
            return formatResponse(403, { message: "Forbidden: You do not own this project" });
        }

        // Fetch history logs
        const logs = await getProgressLogs(teamId);
        console.log(`[INFO] [getHistory] Successfully retrieved progress logs for teamId: ${teamId}`);

        return formatResponse(200, logs);

    } catch (error) {
        console.error("[ERROR] [getHistory] Unhandled exception in handler:", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
