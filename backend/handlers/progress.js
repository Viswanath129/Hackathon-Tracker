const { getProgressLogs, logProgress } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { formatResponse } = require('./utils');
const { validateProgressInput } = require('../utils/validation');

/**
 * Authenticates user from Lambda event context.
 * Supports Cognito authorizer claims (prod) and standard Authorization headers (tests/dev).
 */
const getLambdaUser = async (event) => {
    let email = null;

    // 1. Try Cognito authorizer claims
    const claims = event.requestContext?.authorizer?.claims || event.requestContext?.authorizer?.jwt?.claims;
    if (claims && claims.email) {
        email = claims.email;
    }

    // 2. Try Authorization header
    if (!email) {
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                if (!process.env.JWT_SECRET) {
                    console.error('[ERROR] [getLambdaUser] JWT_SECRET is not configured');
                    throw new Error('JWT_SECRET is not configured');
                }
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
                if (decoded && decoded.email) {
                    email = decoded.email;
                }
            } catch (err) {
                console.warn('[WARN] [getLambdaUser] JWT verification failed:', err.message);
            }
        }
    }

    if (!email) return null;

    let user = await dynamoService.getUser(email);
    if (!user) {
        const allUsers = await dynamoService.getAllUsers();
        user = allUsers.find(t => t.members && t.members.some(m => m.email === email));
    }
    return user;
};

/**
 * Lambda handler for logging a progress update.
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    try {
        console.log('[INFO] [logUpdate] Executing logUpdate handler');

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (err) {
            console.error('[ERROR] [logUpdate] Failed to parse JSON body:', err.message);
            return formatResponse(400, { message: "Invalid JSON format" });
        }

        if (!body) {
            console.error('[ERROR] [logUpdate] Missing request body');
            return formatResponse(400, { message: "Request body is missing" });
        }

        const { teamId, updateText, deltaPercentage } = body;
        console.log('[INFO] [logUpdate] Received progress update request for teamId:', teamId);

        // Authenticate User
        const user = await getLambdaUser(event);
        if (!user) {
            console.warn('[WARN] [logUpdate] Authentication failed');
            return formatResponse(401, { message: "Unauthorized" });
        }

        // Validate inputs before database calls
        const validation = validateProgressInput(body);
        if (!validation.valid) {
            console.warn('[WARN] [logUpdate] Validation failed:', validation.error);
            return formatResponse(400, { message: validation.error });
        }

        // BOLA check: find project to verify ownership using efficient query helper
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            console.warn('[WARN] [logUpdate] Project not found for teamId:', teamId);
            return formatResponse(404, { message: "Project not found" });
        }

        if (user.role !== 'admin' && project.team_id !== user._id) {
            console.warn(`[WARN] [logUpdate] BOLA verification failed: User ${user.email} does not own project ${teamId}`);
            return formatResponse(403, { message: "Forbidden" });
        }

        // Successful BOLA and validation: save progress
        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        console.log('[INFO] [logUpdate] Progress logged successfully for teamId:', teamId);

        return formatResponse(201, result);
    } catch (error) {
        console.error('[ERROR] [logUpdate] Detailed error:', error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * Lambda handler for retrieving progress history.
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    try {
        console.log('[INFO] [getHistory] Executing getHistory handler');

        const teamId = event.pathParameters?.teamId;
        console.log('[INFO] [getHistory] Querying progress history for teamId:', teamId);

        if (!teamId) {
            console.warn('[WARN] [getHistory] Missing teamId parameter');
            return formatResponse(400, { message: "Missing teamId parameter" });
        }

        // Authenticate User
        const user = await getLambdaUser(event);
        if (!user) {
            console.warn('[WARN] [getHistory] Authentication failed');
            return formatResponse(401, { message: "Unauthorized" });
        }

        // BOLA check: find project to verify ownership using efficient query helper
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            console.warn('[WARN] [getHistory] Project not found for teamId:', teamId);
            return formatResponse(404, { message: "Project not found" });
        }

        if (user.role !== 'admin' && project.team_id !== user._id) {
            console.warn(`[WARN] [getHistory] BOLA verification failed: User ${user.email} does not own project ${teamId}`);
            return formatResponse(403, { message: "Forbidden" });
        }

        const logs = await getProgressLogs(teamId);
        console.log('[INFO] [getHistory] Progress history retrieved successfully for teamId:', teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error('[ERROR] [getHistory] Detailed error:', error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory, getLambdaUser };
