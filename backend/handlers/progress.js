const jwt = require('jsonwebtoken');
const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Helper to standardise CORS headers.
 */
const getCorsHeaders = () => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
});

/**
 * Verify JWT token from request headers.
 */
const verifyToken = async (event) => {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
        return null; // Fails securely if secret is unconfigured
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user = await dynamoService.getUser(decoded.email);

        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
        }

        if (!user) {
            return null;
        }

        return { ...user, loginEmail: decoded.email };
    } catch (err) {
        return null;
    }
};

/**
 * Lambda handler for POST /api/progress/update
 */
const logUpdate = async (event) => {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: getCorsHeaders(),
                body: JSON.stringify({ message: 'Missing request body' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseErr) {
            return {
                statusCode: 400,
                headers: getCorsHeaders(),
                body: JSON.stringify({ message: 'Invalid JSON request body' })
            };
        }

        const user = await verifyToken(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: getCorsHeaders(),
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers: getCorsHeaders(),
                body: JSON.stringify({ message: validation.message })
            };
        }

        const { teamId, updateText, deltaPercentage } = body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: getCorsHeaders(),
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        const isOwner = checkProjectOwnership(user, project);
        if (!isOwner) {
            return {
                statusCode: 403,
                headers: getCorsHeaders(),
                body: JSON.stringify({ message: 'Forbidden' })
            };
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);
        return {
            statusCode: 201,
            headers: getCorsHeaders(),
            body: JSON.stringify({ message: 'Progress update logged successfully', result })
        };
    } catch (error) {
        console.error('Error in logUpdate handler:', error);
        return {
            statusCode: 500,
            headers: getCorsHeaders(),
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * Lambda handler for GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    try {
        const user = await verifyToken(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: getCorsHeaders(),
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
        if (!teamId) {
            return {
                statusCode: 400,
                headers: getCorsHeaders(),
                body: JSON.stringify({ message: 'Missing teamId path parameter' })
            };
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: getCorsHeaders(),
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        const isOwner = checkProjectOwnership(user, project);
        if (!isOwner) {
            return {
                statusCode: 403,
                headers: getCorsHeaders(),
                body: JSON.stringify({ message: 'Forbidden' })
            };
        }

        const logs = await progressService.getProgressLogs(teamId);
        return {
            statusCode: 200,
            headers: getCorsHeaders(),
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error('Error in getHistory handler:', error);
        return {
            statusCode: 500,
            headers: getCorsHeaders(),
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = {
    logUpdate,
    getHistory
};
