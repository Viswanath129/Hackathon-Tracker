const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const buildResponse = (statusCode, body) => ({
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
});

const verifyAuth = async (event) => {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { errorStatus: 401, errorMessage: 'Unauthorized: Missing or invalid Authorization header' };
    }

    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET) {
        return { errorStatus: 401, errorMessage: 'Unauthorized: JWT_SECRET not configured' };
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user = await dynamoService.getUser(decoded.email);

        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
        }

        if (!user) {
            return { errorStatus: 401, errorMessage: 'Unauthorized: User not found' };
        }

        return { user };
    } catch (err) {
        return { errorStatus: 401, errorMessage: 'Unauthorized: Invalid token' };
    }
};

const logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return buildResponse(200, { message: 'CORS preflight OK' });
    }

    try {
        const authResult = await verifyAuth(event);
        if (authResult.errorStatus) {
            return buildResponse(authResult.errorStatus, { message: authResult.errorMessage });
        }
        const { user } = authResult;

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (err) {
            return buildResponse(400, { message: 'Bad Request: Invalid JSON in request body' });
        }

        const validation = validateProgressInput(body);
        if (!validation.valid) {
            return buildResponse(400, { message: `Bad Request: ${validation.message}` });
        }

        const { teamId, updateText, deltaPercentage } = body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return buildResponse(404, { message: 'Project not found' });
        }

        if (!checkProjectOwnership(user, project)) {
            return buildResponse(404, { message: 'Project not found' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return buildResponse(201, {
            message: 'Progress update logged successfully',
            timestamp: result.timestamp,
            data: { teamId, updateText, deltaPercentage }
        });
    } catch (error) {
        console.error('Lambda logUpdate error:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return buildResponse(200, { message: 'CORS preflight OK' });
    }

    try {
        const authResult = await verifyAuth(event);
        if (authResult.errorStatus) {
            return buildResponse(authResult.errorStatus, { message: authResult.errorMessage });
        }
        const { user } = authResult;

        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            return buildResponse(400, { message: 'Bad Request: Missing teamId path parameter' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return buildResponse(404, { message: 'Project not found' });
        }

        if (!checkProjectOwnership(user, project)) {
            return buildResponse(404, { message: 'Project not found' });
        }

        const logs = await getProgressLogs(teamId);
        return buildResponse(200, logs || []);
    } catch (error) {
        console.error('Lambda getHistory error:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
