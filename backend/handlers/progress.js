const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

const verifyToken = (event) => {
    if (!process.env.JWT_SECRET) {
        return null;
    }

    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader) {
        return null;
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
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
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        const user = verifyToken(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Missing request body' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Invalid JSON payload' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: validation.message })
            };
        }

        const { teamId, updateText, deltaPercentage } = body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        if (!checkProjectOwnership(user, project)) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Access denied: Project ownership check failed' })
            };
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        return {
            statusCode: 201,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Progress logged successfully', result })
        };
    } catch (error) {
        console.error('Error in logUpdate handler:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        const user = verifyToken(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
        if (!teamId) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        if (!checkProjectOwnership(user, project)) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Access denied: Project ownership check failed' })
            };
        }

        const logs = await getProgressLogs(teamId);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error('Error in getHistory handler:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = { logUpdate, getHistory };
