const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
};

const extractUserFromEvent = (event) => {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'Not authorized, no token', statusCode: 401 };
    }

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured in environment');
        return { error: 'Authentication service misconfigured', statusCode: 500 };
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { user: decoded };
    } catch (err) {
        console.error('JWT verification failed:', err.message);
        return { error: 'Not authorized, token failed', statusCode: 401 };
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
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Request body is missing' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Invalid JSON payload' })
            };
        }

        const authResult = extractUserFromEvent(event);
        if (authResult.error) {
            return {
                statusCode: authResult.statusCode,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: authResult.error })
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

        const { teamId, updateText, deltaPercentage } = body;
        console.log(`Processing progress update for teamId: ${teamId}`);

        const isAuthorized = await checkProjectOwnership(authResult.user, teamId);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Forbidden: Access denied for this project' })
            };
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));

        return {
            statusCode: 201,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                data: result
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
};

/**
 * Lambda handler for GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    try {
        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
        if (!teamId) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'teamId parameter is required' })
            };
        }

        console.log(`Fetching progress history for teamId: ${teamId}`);

        const authResult = extractUserFromEvent(event);
        if (authResult.error) {
            return {
                statusCode: authResult.statusCode,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: authResult.error })
            };
        }

        const isAuthorized = await checkProjectOwnership(authResult.user, teamId);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Forbidden: Access denied for this project' })
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
