const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const buildResponse = (statusCode, body) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173'
    },
    body: JSON.stringify(body)
});

const getAuthToken = (event) => {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.split(' ')[1];
};

const verifyUser = (event) => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
        return null;
    }
    const token = getAuthToken(event);
    if (!token) {
        return null;
    }
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

const logUpdate = async (event) => {
    try {
        if (!event || !event.body) {
            return buildResponse(400, { message: 'Request body is required' });
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseErr) {
            return buildResponse(400, { message: 'Invalid JSON request body' });
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return buildResponse(400, { message: validation.error });
        }

        const user = verifyUser(event);
        if (!user) {
            return buildResponse(401, { message: 'Not authorized' });
        }

        const { teamId, updateText, deltaPercentage } = body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return buildResponse(404, { message: 'Project not found' });
        }

        const isAuthorized = checkProjectOwnership(user, project);
        if (!isAuthorized) {
            return buildResponse(403, { message: 'Not authorized for this project' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return buildResponse(201, { message: 'Progress updated successfully', ...result });
    } catch (error) {
        console.error('Error in logUpdate handler:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

const getHistory = async (event) => {
    try {
        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
        if (!teamId) {
            return buildResponse(400, { message: 'teamId is required' });
        }

        const user = verifyUser(event);
        if (!user) {
            return buildResponse(401, { message: 'Not authorized' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return buildResponse(404, { message: 'Project not found' });
        }

        const isAuthorized = checkProjectOwnership(user, project);
        if (!isAuthorized) {
            return buildResponse(403, { message: 'Not authorized for this project' });
        }

        const logs = await getProgressLogs(teamId);
        return buildResponse(200, { success: true, logs });
    } catch (error) {
        console.error('Error in getHistory handler:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
