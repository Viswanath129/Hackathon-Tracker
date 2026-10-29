const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

/**
 * Helper to authenticate token and return user object.
 */
async function authenticateToken(event) {
    const authHeader = event.headers?.authorization || event.headers?.Authorization || event.headers?.AUTHORIZATION;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.trim() === '') {
        return null;
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
        decoded = jwt.verify(token, jwtSecret);
    } catch (jwtErr) {
        return null;
    }

    let user = await dynamoService.getUser(decoded.email);
    if (!user) {
        const allUsers = await dynamoService.getAllUsers();
        user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
    }

    if (!user) {
        return null;
    }

    return { ...user, loginEmail: decoded.email };
}

/**
 * Lambda handler for POST /api/progress/update
 */
async function logUpdate(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        const user = await authenticateToken(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Not authorized, token failed' })
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Missing or invalid request body' })
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
        if (!validation.isValid && !validation.valid) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: validation.error || validation.message })
            };
        }

        const project = await dynamoService.getProjectById(body.teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Project or team not found' })
            };
        }

        const isOwner = checkProjectOwnership(user, project);
        if (!isOwner) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Forbidden: Access denied to this project' })
            };
        }

        const savedLog = await dynamoService.saveProgressLog(body.teamId, body);

        return {
            statusCode: 201,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                data: savedLog
            })
        };
    } catch (error) {
        console.error('Error in logUpdate handler:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
}

/**
 * Lambda handler for GET /api/progress/{teamId}
 */
async function getHistory(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        const user = await authenticateToken(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Not authorized, token failed' })
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
                body: JSON.stringify({ message: 'Project or team not found' })
            };
        }

        const isOwner = checkProjectOwnership(user, project);
        if (!isOwner) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Forbidden: Access denied to this project' })
            };
        }

        const logs = await dynamoService.getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Progress history retrieved successfully',
                data: logs
            })
        };
    } catch (error) {
        console.error('Error in getHistory handler:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
}

module.exports = {
    logUpdate,
    getHistory
};
