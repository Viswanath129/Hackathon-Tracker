const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Content-Type': 'application/json'
});

const verifyTokenFromHeaders = async (headers) => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
        throw { statusCode: 401, message: 'JWT_SECRET is unconfigured' };
    }

    const authHeader = headers?.authorization || headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw { statusCode: 401, message: 'Not authorized, no token' };
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (err) {
        throw { statusCode: 401, message: 'Not authorized, token failed' };
    }
};

const logUpdate = async (event) => {
    const headers = getCorsHeaders();

    try {
        if (!event || !event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing request body' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (err) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON payload' })
            };
        }

        let user;
        try {
            user = await verifyTokenFromHeaders(event.headers);
        } catch (authError) {
            return {
                statusCode: authError.statusCode || 401,
                headers,
                body: JSON.stringify({ message: authError.message || 'Unauthorized' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: validation.error })
            };
        }

        const project = await dynamoService.getProjectById(body.teamId);
        if (!project || !checkProjectOwnership(user, project)) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        const result = await logProgress(body.teamId, body.updateText, body.deltaPercentage);
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ message: 'Progress update logged successfully', ...result })
        };
    } catch (error) {
        console.error('Error in logUpdate handler:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

const getHistory = async (event) => {
    const headers = getCorsHeaders();

    try {
        let user;
        try {
            user = await verifyTokenFromHeaders(event.headers);
        } catch (authError) {
            return {
                statusCode: authError.statusCode || 401,
                headers,
                body: JSON.stringify({ message: authError.message || 'Unauthorized' })
            };
        }

        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
        if (!teamId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project || !checkProjectOwnership(user, project)) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        const logs = await getProgressLogs(teamId);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error('Error in getHistory handler:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = { logUpdate, getHistory };
