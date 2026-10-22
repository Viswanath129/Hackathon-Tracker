const jwt = require('jsonwebtoken');
const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const buildResponse = (statusCode, body) => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173'
        },
        body: JSON.stringify(body)
    };
};

const verifyAuthHeader = async (authorization) => {
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return { errorStatus: 401, errorMessage: 'Not authorized, no token' };
    }

    const token = authorization.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('JWT_SECRET is missing from environment variables');
        return { errorStatus: 500, errorMessage: 'Internal Server Error' };
    }

    try {
        const decoded = jwt.verify(token, secret);
        let user = await dynamoService.getUser(decoded.email);

        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
        }

        if (!user) {
            return { errorStatus: 401, errorMessage: 'User not found in cloud' };
        }

        return { user: { ...user, loginEmail: decoded.email } };
    } catch (err) {
        console.error('JWT verification error:', err);
        return { errorStatus: 401, errorMessage: 'Not authorized, token failed' };
    }
};

exports.logUpdate = async (event) => {
    try {
        const authHeader = event.headers ? (event.headers.Authorization || event.headers.authorization) : null;
        const authResult = await verifyAuthHeader(authHeader);
        if (authResult.errorMessage) {
            return buildResponse(authResult.errorStatus, { message: authResult.errorMessage });
        }

        if (!event.body) {
            return buildResponse(400, { message: 'Request body is required' });
        }

        let bodyData;
        try {
            bodyData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return buildResponse(400, { message: 'Invalid JSON request body' });
        }

        const validation = validateProgressInput(bodyData);
        if (!validation.valid) {
            return buildResponse(400, { message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = validation.data;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return buildResponse(404, { message: 'Project not found' });
        }

        if (!checkProjectOwnership(authResult.user, project)) {
            return buildResponse(403, { message: 'Forbidden: You do not own this project' });
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);
        return buildResponse(201, { message: 'Progress update logged successfully', data: result });
    } catch (error) {
        console.error('Error in logUpdate handler:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

exports.getHistory = async (event) => {
    try {
        const authHeader = event.headers ? (event.headers.Authorization || event.headers.authorization) : null;
        const authResult = await verifyAuthHeader(authHeader);
        if (authResult.errorMessage) {
            return buildResponse(authResult.errorStatus, { message: authResult.errorMessage });
        }

        const teamId = event.pathParameters ? event.pathParameters.teamId : null;

        if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
            return buildResponse(400, { message: 'teamId parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return buildResponse(404, { message: 'Project not found' });
        }

        if (!checkProjectOwnership(authResult.user, project)) {
            return buildResponse(403, { message: 'Forbidden: You do not own this project' });
        }

        const logs = await progressService.getProgressLogs(teamId);
        return buildResponse(200, { message: 'Progress logs retrieved successfully', data: logs });
    } catch (error) {
        console.error('Error in getHistory handler:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};
