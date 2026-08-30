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

function getUserFromEvent(event) {
    if (event.requestContext && event.requestContext.authorizer) {
        const claims = event.requestContext.authorizer.claims || event.requestContext.authorizer;
        if (claims && (claims.email || claims.sub)) {
            return {
                email: claims.email,
                _id: claims.sub || claims._id || claims.id,
                role: claims.role || claims['custom:role'] || 'user'
            };
        }
    }

    const headers = event.headers || {};
    const authHeader = headers.authorization || headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }
        return jwt.verify(token, process.env.JWT_SECRET);
    }

    return null;
}

const logUpdate = async (event) => {
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
        } catch (e) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Invalid JSON format in request body' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: validation.message })
            };
        }

        const { teamId, updateText } = body;
        console.log(`Processing progress log for teamId: ${teamId}`);

        let user;
        try {
            user = getUserFromEvent(event);
        } catch (authErr) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: authErr.message || 'Unauthorized' })
            };
        }

        if (!user) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        const isAuthorized = await checkProjectOwnership(teamId, user);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Forbidden: Access denied for this project' })
            };
        }

        const result = await logProgress(teamId, updateText, validation.numDelta);

        return {
            statusCode: 201,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                data: result
            })
        };
    } catch (error) {
        console.error('Error logging progress update:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

const getHistory = async (event) => {
    try {
        const teamId = event.pathParameters && (event.pathParameters.teamId || event.pathParameters.id);

        if (!teamId) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'teamId parameter is required' })
            };
        }

        console.log(`Fetching progress history for teamId: ${teamId}`);

        let user;
        try {
            user = getUserFromEvent(event);
        } catch (authErr) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: authErr.message || 'Unauthorized' })
            };
        }

        if (!user) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        const isAuthorized = await checkProjectOwnership(teamId, user);
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
        console.error('Error fetching progress history:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = { logUpdate, getHistory };
