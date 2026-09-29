const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { getProjectById } = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const extractUserFromEvent = (event) => {
    // Check for API Gateway Cognito Authorizer claims first
    if (event.requestContext?.authorizer?.claims) {
        const claims = event.requestContext.authorizer.claims;
        return {
            email: claims.email,
            _id: claims.sub || claims['cognito:username'],
            role: claims['custom:role'] || claims.role || 'user',
            teamId: claims['custom:teamId'] || claims.teamId
        };
    }

    // Check Authorization header for JWT token
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
        return null;
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('JWT_SECRET is not configured');
        return null;
    }

    try {
        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch (err) {
        console.error('JWT Verification Error:', err.message);
        return null;
    }
};

/**
 * Lambda handler for logging progress updates.
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
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
                body: JSON.stringify({ message: 'Invalid JSON request body' })
            };
        }

        const { teamId, updateText, deltaPercentage } = body;

        const validation = validateProgressInput(teamId, updateText, deltaPercentage);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: validation.error })
            };
        }

        const user = extractUserFromEvent(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Unauthorized: Missing or invalid token' })
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
                body: JSON.stringify({ message: 'Forbidden: You do not have access to this project' })
            };
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);

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
 * Lambda handler for getting progress history.
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    try {
        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'teamId parameter is required' })
            };
        }

        const user = extractUserFromEvent(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Unauthorized: Missing or invalid token' })
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
                body: JSON.stringify({ message: 'Forbidden: You do not have access to this project' })
            };
        }

        const logs = await getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Progress history retrieved successfully',
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

module.exports = {
    logUpdate,
    getHistory
};
