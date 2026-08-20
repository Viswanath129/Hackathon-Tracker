const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { buildResponse, buildErrorResponse } = require('./utils');

/**
 * Helper to authenticate user from event headers or authorizer context
 */
const verifyUser = async (event) => {
    if (event.requestContext?.authorizer?.claims) {
        const claims = event.requestContext.authorizer.claims;
        const email = claims.email;
        if (email) {
            const user = await dynamoService.getUser(email);
            if (user) return user;
        }
    }

    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET environment variable is not configured');
        return null;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user = await dynamoService.getUser(decoded.email);
        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
        }
        if (user) {
            user.loginEmail = decoded.email;
        }
        return user;
    } catch (err) {
        console.error('Token verification failed:', err.message);
        return null;
    }
};

/**
 * Lambda handler for logging progress update
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return buildResponse(200, {});
    }

    if (!event.body) {
        return buildErrorResponse(400, 'Request body is required');
    }

    let payload;
    try {
        payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (err) {
        return buildErrorResponse(400, 'Invalid JSON in request body');
    }

    const { teamId, updateText, deltaPercentage } = payload || {};

    console.log(`Processing progress log update for teamId: ${teamId}`);

    const validation = validateProgressInput(payload);
    if (!validation.valid) {
        return buildErrorResponse(400, validation.message);
    }

    try {
        const user = await verifyUser(event);
        if (!user) {
            return buildErrorResponse(401, 'Unauthorized access');
        }

        if (user.role !== 'admin') {
            const project = await dynamoService.getProjectById(teamId);
            if (project) {
                if (project.team_id !== user._id && project.team_id !== user.email) {
                    return buildErrorResponse(403, 'Forbidden: BOLA check failed');
                }
            } else {
                if (user._id !== teamId && user.email !== teamId) {
                    return buildErrorResponse(403, 'Forbidden: BOLA check failed');
                }
            }
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return buildResponse(201, result);
    } catch (error) {
        console.error('Unhandled error in logUpdate handler:', error);
        return buildErrorResponse(500, 'Internal Server Error');
    }
};

/**
 * Lambda handler for getting progress history
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return buildResponse(200, {});
    }

    try {
        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
        if (!teamId) {
            return buildErrorResponse(400, 'teamId path parameter is required');
        }

        console.log(`Fetching progress history for teamId: ${teamId}`);

        const user = await verifyUser(event);
        if (!user) {
            return buildErrorResponse(401, 'Unauthorized access');
        }

        if (user.role !== 'admin') {
            const project = await dynamoService.getProjectById(teamId);
            if (project) {
                if (project.team_id !== user._id && project.team_id !== user.email) {
                    return buildErrorResponse(403, 'Forbidden: BOLA check failed');
                }
            } else if (user._id !== teamId && user.email !== teamId) {
                return buildErrorResponse(403, 'Forbidden: BOLA check failed');
            }
        }

        const logs = await getProgressLogs(teamId);
        return buildResponse(200, logs);
    } catch (error) {
        console.error('Unhandled error in getHistory handler:', error);
        return buildErrorResponse(500, 'Internal Server Error');
    }
};

module.exports = {
    logUpdate,
    getHistory
};
