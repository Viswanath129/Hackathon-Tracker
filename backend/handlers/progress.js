const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { buildResponse } = require('./utils');

/**
 * BOLA / Authorization Helper: Extracts user from JWT token and checks project access.
 */
const verifyAccess = async (event, teamId) => {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authorized: false, statusCode: 401, error: 'Not authorized, no token provided' };
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('JWT_SECRET environment variable is not configured');
            return { authorized: false, statusCode: 500, error: 'Internal server configuration error' };
        }
        decoded = jwt.verify(token, secret);
    } catch (err) {
        return { authorized: false, statusCode: 401, error: 'Not authorized, token invalid or expired' };
    }

    const user = await dynamoService.getUser(decoded.email);
    if (!user) {
        return { authorized: false, statusCode: 401, error: 'User not found' };
    }

    // Admins have access to all projects
    if (user.role === 'admin') {
        return { authorized: true, user };
    }

    // Non-admin verification (BOLA)
    const project = await dynamoService.getProjectById(teamId);
    if (!project) {
        return { authorized: false, statusCode: 404, error: 'Project not found' };
    }

    // Direct owner check (user PK or email)
    if (project.userEmail === user.email || project.PK === `USER#${user.email.toLowerCase()}`) {
        return { authorized: true, user };
    }

    // Team members check
    if (user.members && Array.isArray(user.members)) {
        const isMember = user.members.some(m => m.email === decoded.email || m.email === user.email);
        if (isMember) {
            return { authorized: true, user };
        }
    }

    return { authorized: false, statusCode: 403, error: 'Forbidden: You do not have permission to access this project' };
};

/**
 * Lambda Handler: POST /api/progress/update
 */
const logUpdate = async (event) => {
    try {
        if (!event.body) {
            return buildResponse(400, { message: 'Missing request body' });
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return buildResponse(400, { message: 'Invalid JSON request body' });
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return buildResponse(400, { message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = validation.data;

        // BOLA / Authorization check
        const authCheck = await verifyAccess(event, teamId);
        if (!authCheck.authorized) {
            return buildResponse(authCheck.statusCode, { message: authCheck.error });
        }

        console.log(`Logging progress update for project/team: ${teamId}`);
        const result = await logProgress(teamId, updateText, deltaPercentage);

        return buildResponse(201, {
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in logUpdate handler:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * Lambda Handler: GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    try {
        const teamId = event.pathParameters?.teamId;
        if (!teamId || teamId.trim() === '') {
            return buildResponse(400, { message: 'teamId path parameter is required' });
        }

        // BOLA / Authorization check
        const authCheck = await verifyAccess(event, teamId);
        if (!authCheck.authorized) {
            return buildResponse(authCheck.statusCode, { message: authCheck.error });
        }

        console.log(`Fetching progress history for project/team: ${teamId}`);
        const logs = await getProgressLogs(teamId);

        return buildResponse(200, {
            message: 'Progress history retrieved successfully',
            data: logs || []
        });
    } catch (error) {
        console.error('Error in getHistory handler:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
