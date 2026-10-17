const jwt = require('jsonwebtoken');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');
const dynamoService = require('../services/dynamoService');
const progressService = require('../services/progressService');

const getCorsHeaders = () => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
});

const verifyTokenFromEvent = (event) => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
        return null;
    }

    const authHeader = event?.headers?.authorization || event?.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (err) {
        return null;
    }
};

const logUpdate = async (event) => {
    const headers = getCorsHeaders();

    try {
        const user = verifyTokenFromEvent(event);
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        if (!event || !event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing request body' })
            };
        }

        let parsedBody;
        try {
            parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON payload' })
            };
        }

        const validation = validateProgressInput(parsedBody);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: validation.error })
            };
        }

        const { teamId, updateText, deltaPercentage } = parsedBody;
        const project = await dynamoService.getProjectById(teamId);

        if (!project || !checkProjectOwnership(user, project)) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ message: 'Progress update logged successfully', data: result })
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
        const user = verifyTokenFromEvent(event);
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        const teamId = event?.pathParameters?.teamId;
        if (!teamId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing teamId path parameter' })
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

        const logs = await progressService.getProgressLogs(teamId);

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
