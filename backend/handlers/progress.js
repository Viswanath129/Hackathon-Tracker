const jwt = require('jsonwebtoken');
const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
});

const getUserFromEvent = async (event) => {
    // Priority 1: Cognito Authorizer claims from API Gateway
    if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims) {
        const claims = event.requestContext.authorizer.claims;
        return {
            email: claims.email,
            role: claims['custom:role'] || 'user'
        };
    }

    // Priority 2: Bearer JWT token in Authorization header
    const authHeader = event.headers ? (event.headers.Authorization || event.headers.authorization) : null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('JWT_SECRET is not configured');
            return null;
        }
        try {
            const decoded = jwt.verify(token, secret);
            let user = await dynamoService.getUser(decoded.email);
            if (!user) {
                const allUsers = await dynamoService.getAllUsers();
                user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
            }
            if (user) {
                return { ...user, loginEmail: decoded.email };
            }
        } catch (err) {
            console.error('Token verification failed:', err.message);
            return null;
        }
    }

    return null;
};

exports.logUpdate = async (event) => {
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
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON body' })
            };
        }

        const validation = validateProgressInput(body || {});
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Validation failed', errors: validation.errors })
            };
        }

        const { teamId, updateText, deltaPercentage } = body;
        console.log(`Processing progress log update for teamId: ${teamId}`);

        const user = await getUserFromEvent(event);
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        const hasAccess = await checkProjectOwnership(user, teamId);
        if (!hasAccess) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access denied to project' })
            };
        }

        const result = await progressService.logProgress(teamId, updateText, Number(deltaPercentage));

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                data: result
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

exports.getHistory = async (event) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const teamId = event.pathParameters ? event.pathParameters.teamId : null;
        if (!teamId) {
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
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        const hasAccess = await checkProjectOwnership(user, teamId);
        if (!hasAccess) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access denied to project' })
            };
        }

        const logs = await progressService.getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                teamId,
                logs: logs || []
            })
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
