const jwt = require('jsonwebtoken');
const progressService = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Content-Type': 'application/json'
});

/**
 * Authenticates user from Lambda event headers (JWT) or Cognito authorizer claims
 */
const authenticateEventUser = (event) => {
    // 1. Check Cognito Authorizer Claims
    if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims) {
        const claims = event.requestContext.authorizer.claims;
        return {
            email: claims.email,
            role: claims['custom:role'] || claims.role || 'user',
            _id: claims.sub || claims['cognito:username']
        };
    }

    // 2. Check JWT Authorization Header
    const headers = event.headers || {};
    const authHeader = headers.Authorization || headers.authorization;

    if (!authHeader) {
        return null;
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
        console.error('JWT_SECRET is unconfigured or empty');
        return null;
    }

    try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (err) {
        console.error('JWT verification failed:', err.message);
        return null;
    }
};

/**
 * Lambda handler for logging progress updates (POST /api/progress/update)
 */
const logUpdate = async (event) => {
    const headers = getCorsHeaders();

    if (!event || event.body === undefined || event.body === null) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Request body is required' })
        };
    }

    let payload;
    try {
        payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Invalid JSON body' })
        };
    }

    const user = authenticateEventUser(event);
    if (!user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Unauthorized: Invalid or missing authentication token' })
        };
    }

    const validation = validateProgressInput(payload);
    if (!validation.isValid) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: validation.error })
        };
    }

    const { teamId, updateText, deltaPercentage } = payload;
    console.log(`Logging progress update for teamId: ${teamId}`);

    try {
        const isAuthorized = await checkProjectOwnership(user, teamId);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Insufficient permissions for this project' })
            };
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ message: 'Progress update logged successfully', data: result })
        };
    } catch (error) {
        console.error('Error logging progress in Lambda handler:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * Lambda handler for getting progress history (GET /api/progress/{teamId})
 */
const getHistory = async (event) => {
    const headers = getCorsHeaders();

    const pathParams = event?.pathParameters || {};
    const teamId = pathParams.teamId || event?.teamId;

    if (!teamId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'teamId parameter is required' })
        };
    }

    const user = authenticateEventUser(event);
    if (!user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Unauthorized: Invalid or missing authentication token' })
        };
    }

    console.log(`Fetching progress history for teamId: ${teamId}`);

    try {
        const isAuthorized = await checkProjectOwnership(user, teamId);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Insufficient permissions for this project' })
            };
        }

        const history = await progressService.getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ history })
        };
    } catch (error) {
        console.error('Error fetching progress history in Lambda handler:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = { logUpdate, getHistory };
