const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Lambda Handlers for Progress Tracking
 */

const getCorsHeaders = () => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173'
});

const verifyToken = (event) => {
    const authHeader = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
    if (!authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    if (!token || !process.env.JWT_SECRET) {
        return null;
    }
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

const logUpdate = async (event) => {
    const headers = getCorsHeaders();

    try {
        if (!event || !event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid or missing request body' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseErr) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON request body' })
            };
        }

        const decodedUser = verifyToken(event);
        if (!decodedUser) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        // Selective logging to avoid PII / secret exposure
        if (body && body.teamId) {
            console.log(`Processing progress log update for teamId: ${body.teamId}`);
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: validation.error })
            };
        }

        const isAuthorized = await checkProjectOwnership(decodedUser, body.teamId);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access denied' })
            };
        }

        const result = await logProgress(body.teamId, body.updateText, body.deltaPercentage);
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                timestamp: result.timestamp
            })
        };
    } catch (error) {
        console.error("Lambda logUpdate Error:", error);
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
        const teamId = event.pathParameters && event.pathParameters.teamId;
        if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        const decodedUser = verifyToken(event);
        if (!decodedUser) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        console.log(`Fetching progress history for teamId: ${teamId}`);

        const isAuthorized = await checkProjectOwnership(decodedUser, teamId);
        if (!isAuthorized) {
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
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error("Lambda getHistory Error:", error);
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
