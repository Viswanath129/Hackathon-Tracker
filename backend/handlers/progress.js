const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { buildResponse } = require('./utils');
const dynamoService = require('../services/dynamoService');

/**
 * Extracts and verifies JWT from request headers or Cognito authorizer context.
 * Returns decoded payload / user object or throws error.
 */
const verifyAuth = async (event) => {
    // If API Gateway authorizer claims are present (e.g. via Cognito)
    const authorizerClaims = event.requestContext?.authorizer?.claims;
    if (authorizerClaims) {
        return {
            email: authorizerClaims.email || authorizerClaims['cognito:username'],
            role: authorizerClaims['custom:role'] || authorizerClaims.role || 'user'
        };
    }

    // Otherwise check Authorization header
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('UNAUTHORIZED: Missing or invalid authorization token');
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('JWT_SECRET environment variable is not set.');
        throw new Error('SERVER_ERROR: Authentication misconfigured');
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        return decoded;
    } catch (err) {
        throw new Error('UNAUTHORIZED: Invalid token');
    }
};

/**
 * Checks BOLA authorization.
 * Admin users are allowed.
 * Regular users must own or belong to the project/team.
 */
const verifyAuthorization = async (user, teamId) => {
    if (user.role === 'admin') {
        return true;
    }

    const userEmail = (user.email || user.loginEmail || '').toLowerCase();
    if (!userEmail) {
        return false;
    }

    // Check if the user is the primary user or team member
    const teamUser = await dynamoService.getUser(userEmail);
    if (teamUser) {
        if (teamUser._id === teamId || teamUser.teamId === teamId) {
            return true;
        }
    }

    // Scan projects or query project ownership if needed
    // Look up project in DynamoDB if possible
    try {
        const allProjects = await dynamoService.getAllProjects();
        const project = allProjects.find(p => p._id === teamId);
        if (project) {
            if (project.ownerEmail && project.ownerEmail.toLowerCase() === userEmail) {
                return true;
            }
            if (project.teamId && project.teamId === teamId) {
                // If user is part of the team
                const allUsers = await dynamoService.getAllUsers();
                const matchedUser = allUsers.find(u => u.email?.toLowerCase() === userEmail || (u.members && u.members.some(m => m.email?.toLowerCase() === userEmail)));
                if (matchedUser && (matchedUser._id === teamId || matchedUser.teamId === teamId)) {
                    return true;
                }
            }
        }
    } catch (err) {
        console.error('Authorization check error:', err);
    }

    // Direct check if teamId matches user._id or user's email prefix
    if (user._id === teamId) {
        return true;
    }

    return false;
};

/**
 * POST /api/progress/update
 * Handler for logging progress updates.
 */
const logUpdate = async (event) => {
    try {
        if (!event.body) {
            return buildResponse(400, { message: 'Missing request body.' });
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return buildResponse(400, { message: 'Invalid JSON body.' });
        }

        // Authenticate
        let user;
        try {
            user = await verifyAuth(event);
        } catch (authErr) {
            const isUnauth = authErr.message.startsWith('UNAUTHORIZED');
            return buildResponse(isUnauth ? 401 : 500, { message: isUnauth ? 'Not authorized' : 'Internal Server Error' });
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Validate
        const validation = validateProgressInput({ teamId, updateText, deltaPercentage });
        if (!validation.valid) {
            return buildResponse(400, { message: validation.message });
        }

        // BOLA Check
        const isAuthorized = await verifyAuthorization(user, teamId);
        if (!isAuthorized) {
            return buildResponse(403, { message: 'Forbidden: You do not have permission to access this project.' });
        }

        // Log selectively (no PII/full event log)
        console.log(`Logging progress update for teamId: ${teamId}`);

        const result = await logProgress(teamId, updateText.trim(), Number(deltaPercentage));
        return buildResponse(201, {
            message: 'Progress update logged successfully.',
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error('Unhandled error in logUpdate:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * GET /api/progress/{teamId}
 * Handler for retrieving progress log history.
 */
const getHistory = async (event) => {
    try {
        const teamId = event.pathParameters?.teamId || event.pathParameters?.proxy;
        if (!teamId || teamId.trim() === '') {
            return buildResponse(400, { message: 'teamId path parameter is required.' });
        }

        // Authenticate
        let user;
        try {
            user = await verifyAuth(event);
        } catch (authErr) {
            const isUnauth = authErr.message.startsWith('UNAUTHORIZED');
            return buildResponse(isUnauth ? 401 : 500, { message: isUnauth ? 'Not authorized' : 'Internal Server Error' });
        }

        // BOLA Check
        const isAuthorized = await verifyAuthorization(user, teamId);
        if (!isAuthorized) {
            return buildResponse(403, { message: 'Forbidden: You do not have permission to access this project.' });
        }

        console.log(`Retrieving progress history for teamId: ${teamId}`);

        const logs = await getProgressLogs(teamId);
        return buildResponse(200, {
            teamId,
            logs: logs || []
        });
    } catch (error) {
        console.error('Unhandled error in getHistory:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
