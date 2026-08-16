const jwt = require('jsonwebtoken');
const { validateProgressInput } = require('../utils/validation');
const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { buildResponse } = require('./utils');

/**
 * Authenticates user from JWT token in request headers or authorizer claims
 */
const authenticateUser = (event) => {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const claims = event.requestContext?.authorizer?.claims;
        if (claims) {
            return {
                email: claims.email,
                role: claims.role || claims['custom:role'] || 'user'
            };
        }
        return null;
    }

    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
        console.error('JWT_SECRET environment variable is missing or empty');
        return null;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (err) {
        console.error('JWT Verification failed:', err.message);
        return null;
    }
};

/**
 * Enforces Broken Object Level Authorization (BOLA) verification
 */
const checkUserAccessToTeam = async (user, teamId) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    const userEmail = (user.email || user.loginEmail || '').toLowerCase();
    if (!userEmail) return false;

    if (teamId.toLowerCase() === userEmail) return true;

    try {
        const project = await dynamoService.getProjectById(teamId);
        if (project) {
            if (project.email && project.email.toLowerCase() === userEmail) return true;
            if (project.userEmail && project.userEmail.toLowerCase() === userEmail) return true;
            if (project.createdBy && project.createdBy.toLowerCase() === userEmail) return true;
            if (project.PK && project.PK.toLowerCase() === `user#${userEmail}`) return true;

            if (project.PK && project.PK.startsWith('HACK#')) {
                const hackId = project.PK.split('HACK#')[1];
                const hackathon = await dynamoService.getHackathon(userEmail, hackId);
                if (hackathon) return true;
            }
        }
    } catch (err) {
        console.error('Error during BOLA check:', err);
    }

    return false;
};

/**
 * Lambda handler for logging progress update (POST /api/progress/update)
 */
const logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return buildResponse(200, '');
    }

    try {
        if (!event.body) {
            return buildResponse(400, { message: 'Request body is missing' });
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseError) {
            return buildResponse(400, { message: 'Invalid JSON body' });
        }

        const { teamId, updateText, deltaPercentage } = body;

        const validation = validateProgressInput(teamId, updateText, deltaPercentage);
        if (!validation.valid) {
            return buildResponse(400, { message: validation.message });
        }

        const user = authenticateUser(event);
        if (!user) {
            return buildResponse(401, { message: 'Unauthorized' });
        }

        // Selective logging (avoid loging full event object / secrets)
        console.log('Logging progress update for teamId:', teamId);

        const hasAccess = await checkUserAccessToTeam(user, teamId);
        if (!hasAccess) {
            return buildResponse(403, { message: 'Forbidden: Access denied to project or team' });
        }

        const result = await progressService.logProgress(teamId, updateText, Number(deltaPercentage));

        return buildResponse(201, {
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Unhandled error in logUpdate handler:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * Lambda handler for getting progress history (GET /api/progress/{teamId})
 */
const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return buildResponse(200, '');
    }

    try {
        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            return buildResponse(400, { message: 'teamId path parameter is required' });
        }

        const user = authenticateUser(event);
        if (!user) {
            return buildResponse(401, { message: 'Unauthorized' });
        }

        // Selective logging
        console.log('Fetching progress history for teamId:', teamId);

        const hasAccess = await checkUserAccessToTeam(user, teamId);
        if (!hasAccess) {
            return buildResponse(403, { message: 'Forbidden: Access denied to project or team' });
        }

        const logs = await progressService.getProgressLogs(teamId);

        return buildResponse(200, {
            message: 'Progress history retrieved',
            data: logs || []
        });
    } catch (error) {
        console.error('Unhandled error in getHistory handler:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdate,
    getHistory,
    authenticateUser,
    checkUserAccessToTeam
};
