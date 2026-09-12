const progressService = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { verifyToken, checkProjectOwnership } = require('../utils/auth');

const getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
    'Content-Type': 'application/json'
});

/**
 * Lambda handler to log a progress update
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    const headers = getCorsHeaders();

    if (event?.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
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
        } catch (parseErr) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON format in request body' })
            };
        }

        // Validate input
        const validation = validateProgressInput(parsedBody);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: validation.message })
            };
        }

        const { teamId, updateText, deltaPercentage } = validation.data;

        // Selective logging without leaking PII or raw event tokens
        console.log(`Processing progress log update for teamId: ${teamId}`);

        // Token authorization check
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        let user;
        try {
            user = verifyToken(authHeader);
        } catch (authErr) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: authErr.message || 'Unauthorized' })
            };
        }

        // Ownership / BOLA authorization check
        const isAuthorized = checkProjectOwnership(user, teamId);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: You do not have access to this project' })
            };
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);

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
 * Lambda handler to retrieve progress update history
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const headers = getCorsHeaders();

    if (event?.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const teamId = event?.pathParameters?.teamId || event?.pathParameters?.id || event?.queryStringParameters?.teamId;

        if (!teamId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId parameter is required' })
            };
        }

        console.log(`Fetching progress history for teamId: ${teamId}`);

        // Mandatory token authorization & BOLA check
        const authHeader = event?.headers?.Authorization || event?.headers?.authorization;
        if (!authHeader) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Authorization header missing' })
            };
        }

        try {
            const user = verifyToken(authHeader);
            const isAuthorized = checkProjectOwnership(user, teamId);
            if (!isAuthorized) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ message: 'Forbidden: You do not have access to this project' })
                };
            }
        } catch (authErr) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: authErr.message || 'Unauthorized' })
            };
        }

        const logs = await progressService.getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs || [])
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
