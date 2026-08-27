const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const getCorsHeaders = () => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
});

const getUserFromEvent = async (event) => {
    // 1. Check API Gateway Authorizer claims
    if (event.requestContext?.authorizer?.claims) {
        const claims = event.requestContext.authorizer.claims;
        const email = claims.email;
        if (email) {
            const user = await dynamoService.getUser(email);
            if (user) return user;
            return {
                _id: claims.sub || claims['cognito:username'],
                email,
                role: claims.role || claims['custom:role'] || 'user'
            };
        }
    }

    // 2. Check Authorization Header for JWT
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET environment variable is not configured.');
            return null;
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.email) {
                let user = await dynamoService.getUser(decoded.email);
                if (!user) {
                    const allUsers = await dynamoService.getAllUsers();
                    user = (allUsers || []).find(t => t.members && t.members.some(m => m.email === decoded.email));
                }
                if (user) return { ...user, loginEmail: decoded.email };
                return { _id: decoded.id || decoded._id, email: decoded.email, role: decoded.role || 'user' };
            }
        } catch (err) {
            console.error('Token verification failed:', err.message);
            return null;
        }
    }

    return null;
};

/**
 * Lambda handler for logging progress update (POST /api/progress/update)
 */
const logUpdate = async (event) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Request body is required' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseErr) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON payload' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: validation.message })
            };
        }

        const { teamId, updateText, deltaPercentage } = validation.data;
        console.log(`Processing progress update for teamId: ${teamId}`);

        const user = await getUserFromEvent(event);
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Not authorized' })
            };
        }

        const isAuthorized = await checkProjectOwnership(teamId, user);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access denied for this project' })
            };
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                timestamp: result.timestamp,
                message: 'Progress update logged successfully'
            })
        };
    } catch (error) {
        console.error('Internal server error in logUpdate:', error);
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

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
        if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        console.log(`Fetching progress history for teamId: ${teamId}`);

        const user = await getUserFromEvent(event);
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Not authorized' })
            };
        }

        const isAuthorized = await checkProjectOwnership(teamId, user);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access denied for this project' })
            };
        }

        const logs = await getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs || [])
        };
    } catch (error) {
        console.error('Internal server error in getHistory:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = { logUpdate, getHistory };
