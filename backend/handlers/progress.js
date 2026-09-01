const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json'
};

/**
 * Extracts and verifies JWT user token from authorization header or request context.
 */
const getUserFromEvent = (event) => {
    // Check if authorizer context from API Gateway Cognito is available
    if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims) {
        const claims = event.requestContext.authorizer.claims;
        return {
            email: claims.email,
            role: claims['custom:role'] || claims.role || 'user'
        };
    }

    // Manual JWT check from Authorization header if provided
    const authHeader = event.headers && (event.headers.Authorization || event.headers.authorization);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error("JWT_SECRET environment variable is not configured");
        return null;
    }

    try {
        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch (err) {
        console.error("Invalid JWT token:", err.message);
        return null;
    }
};

/**
 * POST /api/progress/update
 * Handler for logging progress update.
 */
const logUpdate = async (event) => {
    // Handle OPTIONS CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
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
                body: JSON.stringify({ message: 'Invalid JSON payload' })
            };
        }

        const validation = validateProgressInput(body || {});
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Validation failed', errors: validation.errors })
            };
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Selective logging without PII or secret leaking
        console.log(`Processing progress log update for teamId: ${teamId}`);

        const user = getUserFromEvent(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Not authorized, invalid or missing token' })
            };
        }

        const isAuthorized = await checkProjectOwnership(teamId, user);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Forbidden: You do not have permission for this project' })
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
 * GET /api/progress/{teamId}
 * Handler for retrieving progress history.
 */
const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }

    try {
        const teamId = event.pathParameters && event.pathParameters.teamId;
        if (!teamId || teamId.trim() === '') {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        console.log(`Retrieving progress history for teamId: ${teamId}`);

        const user = getUserFromEvent(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Not authorized, invalid or missing token' })
            };
        }

        const isAuthorized = await checkProjectOwnership(teamId, user);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Forbidden: You do not have permission for this project' })
            };
        }

        const logs = await getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Progress history retrieved successfully',
                data: logs || []
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
};

module.exports = { logUpdate, getHistory };
