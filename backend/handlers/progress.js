const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json'
};

const extractUser = (event) => {
    // 1. Authorizer claims (API Gateway / Cognito)
    const claims = event.requestContext?.authorizer?.claims;
    if (claims) {
        return {
            email: claims.email,
            _id: claims.sub || claims['custom:team_id'],
            role: claims['custom:role'] || 'team'
        };
    }

    // 2. JWT Verification via Authorization header
    const headers = event.headers || {};
    const authHeader = headers.authorization || headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is unconfigured');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    }

    return null;
};

const logUpdate = async (event) => {
    try {
        if (!event || !event.body) {
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
                body: JSON.stringify({ message: 'Invalid JSON payload' })
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

        const { teamId, updateText, deltaPercentage } = body;
        console.log(`Processing progress log update for teamId: ${teamId}`);

        let user;
        try {
            user = extractUser(event);
        } catch (err) {
            console.error('Auth extraction failed:', err.message);
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Not authorized' })
            };
        }

        if (!user) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Not authorized, token missing' })
            };
        }

        const isOwner = await checkProjectOwnership(user, teamId);
        if (!isOwner) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Forbidden: Access denied to target project' })
            };
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return {
            statusCode: 201,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Progress update logged successfully', data: result })
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

const getHistory = async (event) => {
    try {
        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
        if (!teamId) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        console.log(`Fetching progress history for teamId: ${teamId}`);

        let user;
        try {
            user = extractUser(event);
        } catch (err) {
            console.error('Auth extraction failed:', err.message);
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Not authorized' })
            };
        }

        if (!user) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Not authorized, token missing' })
            };
        }

        const isOwner = await checkProjectOwnership(user, teamId);
        if (!isOwner) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Forbidden: Access denied to target project history' })
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

module.exports = {
    logUpdate,
    getHistory
};
