const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const extractUserFromEvent = (event) => {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
        return { user: null, error: 'Authorization header missing' };
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
        return { user: null, error: 'Token missing' };
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === '') {
        console.error('JWT_SECRET is not configured in environment');
        return { user: null, error: 'Server authentication configuration error', isConfigError: true };
    }

    try {
        const decoded = jwt.verify(token, secret);
        return { user: decoded, error: null };
    } catch (err) {
        return { user: null, error: 'Invalid or expired token' };
    }
};

/**
 * Lambda handler for logging progress updates (POST /api/progress/update)
 */
const logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Request body is required' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (err) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Invalid JSON in request body' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: validation.error })
            };
        }

        const { user, error, isConfigError } = extractUserFromEvent(event);
        if (error) {
            if (isConfigError) {
                return {
                    statusCode: 500,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ message: 'Internal Server Error' })
                };
            }
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: `Unauthorized: ${error}` })
            };
        }

        const { teamId, updateText, deltaPercentage } = body;

        if (!checkProjectOwnership(user, teamId)) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Forbidden: Access denied for this project/team' })
            };
        }

        console.log(`Logging progress update for teamId: ${teamId}`);
        const result = await logProgress(teamId, updateText, deltaPercentage);

        return {
            statusCode: 201,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                ...result
            })
        };
    } catch (err) {
        console.error('Error logging progress update:', err);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * Lambda handler for retrieving progress history (GET /api/progress/{teamId})
 */
const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
        if (!teamId) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        const { user, error, isConfigError } = extractUserFromEvent(event);
        if (error) {
            if (isConfigError) {
                return {
                    statusCode: 500,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ message: 'Internal Server Error' })
                };
            }
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: `Unauthorized: ${error}` })
            };
        }

        if (!checkProjectOwnership(user, teamId)) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Forbidden: Access denied for this project/team' })
            };
        }

        console.log(`Retrieving progress history for teamId: ${teamId}`);
        const logs = await getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(logs)
        };
    } catch (err) {
        console.error('Error retrieving progress history:', err);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = {
    logUpdate,
    getHistory
};
