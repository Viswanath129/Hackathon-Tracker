const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
};

/**
 * Parses user information from JWT authorization header or API Gateway Cognito context.
 *
 * @param {Object} event - API Gateway event.
 * @returns {Object|null}
 */
function extractUserFromEvent(event) {
    if (event.requestContext && event.requestContext.authorizer) {
        const claims = event.requestContext.authorizer.claims || event.requestContext.authorizer;
        if (claims && (claims.email || claims.sub)) {
            return {
                _id: claims.sub || claims['custom:team_id'] || claims.email,
                email: claims.email,
                role: claims['custom:role'] || claims.role || 'user'
            };
        }
    }

    const authHeader = event.headers && (event.headers.Authorization || event.headers.authorization);
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            if (!process.env.JWT_SECRET) {
                console.error("JWT_SECRET is not defined");
                return null;
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return {
                _id: decoded._id || decoded.id || decoded.email,
                email: decoded.email,
                role: decoded.role || 'user'
            };
        } catch (err) {
            console.error('JWT Token Verification Failed in Lambda handler:', err.message);
            return null;
        }
    }

    return null;
}

/**
 * Lambda handler for logging progress updates (POST /api/progress/update)
 */
async function logUpdate(event) {
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
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Invalid JSON format in request body' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: validation.error })
            };
        }

        const user = extractUserFromEvent(event);
        if (user) {
            const isAuthorized = await checkProjectOwnership(user, validation.projectId);
            if (!isAuthorized) {
                return {
                    statusCode: 403,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ message: 'Forbidden: Access denied for this project resource' })
                };
            }
        }

        console.log(`Logging progress update for teamId/projectId: ${validation.projectId}`);

        const result = await logProgress(
            validation.projectId,
            validation.updateText,
            validation.deltaPercentage
        );

        return {
            statusCode: 201,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Progress log recorded successfully',
                data: result
            })
        };
    } catch (error) {
        console.error('Unhandled Error in logUpdate handler:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
}

/**
 * Lambda handler for fetching progress history (GET /api/progress/{teamId})
 */
async function getHistory(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        const teamId = event.pathParameters && (event.pathParameters.teamId || event.pathParameters.id);

        if (!teamId || teamId.trim() === '') {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        const user = extractUserFromEvent(event);
        if (user) {
            const isAuthorized = await checkProjectOwnership(user, teamId);
            if (!isAuthorized) {
                return {
                    statusCode: 403,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ message: 'Forbidden: Access denied for this project resource' })
                };
            }
        }

        console.log(`Fetching progress logs for teamId/projectId: ${teamId}`);

        const logs = await getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error('Unhandled Error in getHistory handler:', error);
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
