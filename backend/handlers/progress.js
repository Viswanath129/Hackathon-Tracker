const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { getProjectById } = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

const verifyTokenFromEvent = (event) => {
    const headers = event.headers || {};
    const authHeader = headers.authorization || headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        console.error("JWT_SECRET is not configured in environment");
        return null;
    }

    try {
        return jwt.verify(token, secret);
    } catch (err) {
        console.error("Token verification failed:", err.message);
        return null;
    }
};

/**
 * AWS Lambda handler for logging progress update (POST /api/progress/update)
 */
const logUpdate = async (event) => {
    try {
        if (!event || !event.body) {
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
                body: JSON.stringify({ message: 'Invalid JSON payload' })
            };
        }

        const user = verifyTokenFromEvent(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: validation.error })
            };
        }

        const { teamId, updateText, deltaPercentage } = body;

        const project = await getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        const isAuthorized = checkProjectOwnership(user, project);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: Access denied' })
            };
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                data: result
            })
        };
    } catch (error) {
        console.error('Error in logUpdate handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * AWS Lambda handler for retrieving progress history (GET /api/progress/{teamId})
 */
const getHistory = async (event) => {
    try {
        const user = verifyTokenFromEvent(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        const pathParams = event.pathParameters || {};
        const teamId = pathParams.teamId || pathParams.id;

        if (!teamId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        const project = await getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        const isAuthorized = checkProjectOwnership(user, project);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: Access denied' })
            };
        }

        const logs = await getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Progress logs retrieved successfully',
                data: logs || []
            })
        };
    } catch (error) {
        console.error('Error in getHistory handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = { logUpdate, getHistory };
