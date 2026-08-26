const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const getCorsHeaders = () => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
});

const verifyTokenFromEvent = async (event) => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
        console.error('JWT_SECRET is unconfigured');
        return { error: 'Authentication secret unconfigured', statusCode: 401 };
    }

    const headers = event.headers || {};
    const authHeader = headers.authorization || headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'Not authorized, no token', statusCode: 401 };
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user = await dynamoService.getUser(decoded.email);

        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(u => u.members && u.members.some(m => m.email === decoded.email));
        }

        if (!user) {
            return { error: 'User not found', statusCode: 401 };
        }

        return { user };
    } catch (err) {
        console.error('JWT Verification Error:', err.message);
        return { error: 'Not authorized, token failed', statusCode: 401 };
    }
};

/**
 * Lambda handler for logging progress update.
 * POST /api/progress/update
 * Returns 201 Created on success.
 */
const logUpdate = async (event) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Request body is missing' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseError) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON payload' })
            };
        }

        const { teamId, updateText, deltaPercentage } = body || {};

        // Selective logging to avoid printing full event or sensitive data
        console.log('Processing progress update for teamId:', teamId);

        const validation = validateProgressInput({ teamId, updateText, deltaPercentage });
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: validation.error })
            };
        }

        const authResult = await verifyTokenFromEvent(event);
        if (authResult.error) {
            return {
                statusCode: authResult.statusCode,
                headers,
                body: JSON.stringify({ message: authResult.error })
            };
        }

        const isAuthorized = await checkProjectOwnership(authResult.user, teamId);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access to this project is not authorized' })
            };
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                timestamp: result.timestamp
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
 * Lambda handler for getting progress history.
 * GET /api/progress/{teamId}
 * Returns 200 OK on success.
 */
const getHistory = async (event) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    try {
        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        console.log('Fetching progress history for teamId:', teamId);

        const authResult = await verifyTokenFromEvent(event);
        if (authResult.error) {
            return {
                statusCode: authResult.statusCode,
                headers,
                body: JSON.stringify({ message: authResult.error })
            };
        }

        const isAuthorized = await checkProjectOwnership(authResult.user, teamId);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access to this project is not authorized' })
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
