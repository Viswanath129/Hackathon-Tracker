const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const progressService = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const extractUserFromEvent = async (event) => {
    // 1. Check Cognito authorizer claims
    if (event.requestContext?.authorizer?.claims) {
        const claims = event.requestContext.authorizer.claims;
        return {
            email: claims.email,
            sub: claims.sub,
            role: claims['custom:role'] || claims.role || 'user',
            teamId: claims['custom:teamId'] || claims.teamId
        };
    }

    // 2. Fall back to JWT Authorization header
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured');
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user = await dynamoService.getUser(decoded.email);
        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = (allUsers || []).find(t => t.members && t.members.some(m => m.email === decoded.email));
        }
        if (user) {
            return { ...user, loginEmail: decoded.email };
        }
        return decoded;
    } catch (err) {
        console.error('Token verification error:', err);
        return null;
    }
};

const logUpdate = async (event) => {
    try {
        if (!event || typeof event !== 'object') {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Bad Request: Missing event object' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Bad Request: Invalid JSON body' })
            };
        }

        if (!body) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Bad Request: Missing request body' })
            };
        }

        const user = await extractUserFromEvent(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Unauthorized: Invalid or missing token' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: validation.message })
            };
        }

        const teamId = body.teamId || body.projectId;
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        if (!checkProjectOwnership(user, project)) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Forbidden: Access denied' })
            };
        }

        const result = await progressService.logProgress(teamId, body.updateText, body.deltaPercentage);

        return {
            statusCode: 201,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                ...result
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

const getHistory = async (event) => {
    try {
        if (!event || typeof event !== 'object') {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Bad Request: Missing event object' })
            };
        }

        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Bad Request: Missing teamId parameter' })
            };
        }

        const user = await extractUserFromEvent(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Unauthorized: Invalid or missing token' })
            };
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        if (!checkProjectOwnership(user, project)) {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Forbidden: Access denied' })
            };
        }

        const logs = await progressService.getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                success: true,
                logs: logs || []
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
