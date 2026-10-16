const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
});

const verifyToken = (event) => {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader) {
        return null;
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    if (!token || !process.env.JWT_SECRET) {
        return null;
    }

    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

/**
 * Lambda Handler: logUpdate
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const user = verifyToken(event);
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Bad Request: Missing request body' })
            };
        }

        let bodyData;
        try {
            bodyData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (err) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Bad Request: Invalid JSON body' })
            };
        }

        const validation = validateProgressInput(bodyData);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: validation.message })
            };
        }

        const { teamId, updateText, deltaPercentage } = bodyData;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        if (!checkProjectOwnership(user, project)) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access denied' })
            };
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Progress updated successfully',
                data: result
            })
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

/**
 * Lambda Handler: getHistory
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const user = verifyToken(event);
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        const teamId = event.pathParameters?.teamId;
        if (!teamId || teamId.trim().length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId is required' })
            };
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        if (!checkProjectOwnership(user, project)) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access denied' })
            };
        }

        const logs = await getProgressLogs(teamId);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ progress: logs || [] })
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

module.exports = {
    logUpdate,
    getHistory
};
