const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
});

const authenticateEvent = async (event) => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
        console.error("JWT_SECRET environment variable is missing or empty.");
        return { error: { statusCode: 401, headers: getCorsHeaders(), body: JSON.stringify({ message: 'Unauthorized' }) } };
    }

    const headers = event.headers || {};
    const authHeader = headers.Authorization || headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: { statusCode: 401, headers: getCorsHeaders(), body: JSON.stringify({ message: 'Not authorized, no token' }) } };
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user = await dynamoService.getUser(decoded.email);

        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
        }

        if (!user) {
            return { error: { statusCode: 401, headers: getCorsHeaders(), body: JSON.stringify({ message: 'User not found' }) } };
        }

        const { password, ...cleanUser } = user;
        return { user: { ...cleanUser, loginEmail: decoded.email } };
    } catch (error) {
        console.error("JWT verification failed:", error.message);
        return { error: { statusCode: 401, headers: getCorsHeaders(), body: JSON.stringify({ message: 'Not authorized, token failed' }) } };
    }
};

/**
 * Lambda handler to log progress update
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    const corsHeaders = getCorsHeaders();

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON body' })
            };
        }

        const teamId = body.teamId || body.projectId;
        // Selective logging of non-sensitive identifiers only
        console.log(`Processing logUpdate for teamId: ${teamId}`);

        const authResult = await authenticateEvent(event);
        if (authResult.error) {
            return authResult.error;
        }

        const validation = validateProgressInput(body);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: validation.error })
            };
        }

        const isAuthorized = await checkProjectOwnership(authResult.user, teamId);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: Unauthorized access to project' })
            };
        }

        const result = await logProgress(teamId, body.updateText, Number(body.deltaPercentage));

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Progress update logged successfully', ...result })
        };
    } catch (error) {
        console.error('Unhandled error in logUpdate Lambda handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * Lambda handler to get progress history
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const corsHeaders = getCorsHeaders();

    try {
        const teamId = event.pathParameters ? (event.pathParameters.teamId || event.pathParameters.id) : null;

        if (!teamId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'teamId parameter is required' })
            };
        }

        // Selective logging of identifiers
        console.log(`Processing getHistory for teamId: ${teamId}`);

        const authResult = await authenticateEvent(event);
        if (authResult.error) {
            return authResult.error;
        }

        const isAuthorized = await checkProjectOwnership(authResult.user, teamId);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: Unauthorized access to project' })
            };
        }

        const logs = await getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error('Unhandled error in getHistory Lambda handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = { logUpdate, getHistory };
