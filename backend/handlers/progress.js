const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const progressService = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const buildResponse = (statusCode, body) => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        body: JSON.stringify(body)
    };
};

const verifyToken = async (event) => {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: buildResponse(401, { message: 'Not authorized, no token provided' }) };
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return { error: buildResponse(401, { message: 'JWT_SECRET configuration missing' }) };
    }

    try {
        const decoded = jwt.verify(token, secret);
        let user = await dynamoService.getUser(decoded.email);
        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
        }

        if (!user) {
            return { error: buildResponse(401, { message: 'User not found in database' }) };
        }

        const { password, ...cleanUser } = user;
        return { user: { ...cleanUser, loginEmail: decoded.email } };
    } catch (err) {
        return { error: buildResponse(401, { message: 'Not authorized, token verification failed' }) };
    }
};

const logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return buildResponse(200, { message: 'CORS Preflight OK' });
    }

    const authResult = await verifyToken(event);
    if (authResult.error) {
        return authResult.error;
    }
    const user = authResult.user;

    let body;
    try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
        return buildResponse(400, { message: 'Invalid JSON payload' });
    }

    const validation = validateProgressInput(body);
    if (!validation.valid) {
        return buildResponse(400, { message: validation.message });
    }

    const { teamId, updateText, deltaPercentage } = validation.value;

    try {
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return buildResponse(404, { message: 'Project not found' });
        }

        if (!checkProjectOwnership(user, project)) {
            return buildResponse(403, { message: 'Forbidden: Access denied for this project' });
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);
        return buildResponse(201, {
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (err) {
        console.error('Error logging progress update:', err);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return buildResponse(200, { message: 'CORS Preflight OK' });
    }

    const authResult = await verifyToken(event);
    if (authResult.error) {
        return authResult.error;
    }
    const user = authResult.user;

    const teamId = event.pathParameters?.teamId;
    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return buildResponse(400, { message: 'teamId path parameter is required' });
    }

    try {
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return buildResponse(404, { message: 'Project not found' });
        }

        if (!checkProjectOwnership(user, project)) {
            return buildResponse(403, { message: 'Forbidden: Access denied for this project' });
        }

        const logs = await progressService.getProgressLogs(teamId);
        return buildResponse(200, {
            teamId,
            logs
        });
    } catch (err) {
        console.error('Error retrieving progress history:', err);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
