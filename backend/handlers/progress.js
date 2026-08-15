const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { buildResponse, getCorsHeaders } = require('./utils');

/**
 * Verify JWT token from API Gateway / Lambda request headers
 */
const verifyAuthToken = async (event) => {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authorized: false, statusCode: 401, error: 'Not authorized, token missing' };
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === '') {
        console.error('Server Configuration Error: JWT_SECRET is not defined');
        return { authorized: false, statusCode: 500, error: 'Internal Server Error' };
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, secret);
        let user = await dynamoService.getUser(decoded.email);
        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(u => u.members && u.members.some(m => m.email === decoded.email));
        }

        if (!user) {
            return { authorized: false, statusCode: 401, error: 'User not found' };
        }

        return { authorized: true, user: { ...user, loginEmail: decoded.email } };
    } catch (err) {
        return { authorized: false, statusCode: 401, error: 'Not authorized, token failed' };
    }
};

/**
 * Perform Broken Object Level Authorization (BOLA) check
 */
const checkBolaAuthorization = async (user, teamId) => {
    if (user.role === 'admin') {
        return true;
    }

    // Direct match with user's _id or email
    if (user._id === teamId || user.email === teamId) {
        return true;
    }

    // Look up project by ID to check if team owns it
    const project = await dynamoService.getProjectById(teamId);
    if (project && (project.team_id === user._id || project.email === user.email)) {
        return true;
    }

    // Check user's hackathons and projects
    const hackathons = await dynamoService.getHackathonsByUser(user.email);
    for (const hack of hackathons) {
        const projects = await dynamoService.getProjectsByHackathon(hack._id);
        if (projects.some(p => p._id === teamId)) {
            return true;
        }
    }

    return false;
};

/**
 * POST /api/progress/update
 * Lambda Handler
 */
const logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: getCorsHeaders(), body: '' };
    }

    try {
        if (!event.body) {
            return buildResponse(400, { message: 'Missing request body' });
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return buildResponse(400, { message: 'Invalid JSON payload' });
        }

        // Selective logging without leaking full event or secrets
        if (body && body.teamId) {
            console.log(`Processing progress log update for teamId: ${body.teamId}`);
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return buildResponse(400, { message: validation.error });
        }

        const authResult = await verifyAuthToken(event);
        if (!authResult.authorized) {
            return buildResponse(authResult.statusCode, { message: authResult.error });
        }

        const { teamId, updateText, deltaPercentage } = body;
        const isAuthorized = await checkBolaAuthorization(authResult.user, teamId);
        if (!isAuthorized) {
            return buildResponse(403, { message: 'Forbidden: Access to specified team resource denied' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return buildResponse(201, {
            message: 'Progress updated successfully',
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error('Lambda logUpdate Handler Error:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * GET /api/progress/{teamId}
 * Lambda Handler
 */
const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: getCorsHeaders(), body: '' };
    }

    try {
        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
        if (!teamId) {
            return buildResponse(400, { message: 'teamId parameter is required' });
        }

        const authResult = await verifyAuthToken(event);
        if (!authResult.authorized) {
            return buildResponse(authResult.statusCode, { message: authResult.error });
        }

        const isAuthorized = await checkBolaAuthorization(authResult.user, teamId);
        if (!isAuthorized) {
            return buildResponse(403, { message: 'Forbidden: Access to specified team resource denied' });
        }

        const logs = await getProgressLogs(teamId);
        return buildResponse(200, logs || []);
    } catch (error) {
        console.error('Lambda getHistory Handler Error:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdate,
    getHistory,
    verifyAuthToken,
    checkBolaAuthorization
};
