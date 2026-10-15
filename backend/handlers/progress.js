const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const progressService = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json'
});

const verifyToken = (event) => {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'Missing or invalid authorization header' };
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
        return { error: 'JWT_SECRET is not configured' };
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { user: decoded };
    } catch (err) {
        return { error: 'Token verification failed' };
    }
};

const logUpdate = async (event) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Request body is required' })
            };
        }

        let body;
        try {
            body = JSON.parse(event.body);
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON format' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: validation.error || 'Validation failed' })
            };
        }

        let user = null;
        if (event.requestContext?.authorizer?.claims) {
            user = {
                email: event.requestContext.authorizer.claims.email,
                sub: event.requestContext.authorizer.claims.sub,
                teamId: event.requestContext.authorizer.claims['custom:teamId'] || event.requestContext.authorizer.claims.email
            };
        } else {
            const authResult = verifyToken(event);
            if (authResult.error) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ message: 'Unauthorized' })
                };
            }
            user = authResult.user;
        }

        const project = await dynamoService.getProjectById(body.teamId);
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
                body: JSON.stringify({ message: 'Forbidden' })
            };
        }

        await progressService.logProgress(body.teamId, body.updateText, body.deltaPercentage);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ message: 'Progress logged successfully', teamId: body.teamId })
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

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const authResult = verifyToken(event);
        if (authResult.error) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
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

        const user = authResult.user;
        if (!checkProjectOwnership(user, project)) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden' })
            };
        }

        const logs = await progressService.getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ logs: logs || [] })
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
