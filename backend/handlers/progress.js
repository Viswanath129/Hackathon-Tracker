const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const extractUserFromEvent = (event) => {
    if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims) {
        const claims = event.requestContext.authorizer.claims;
        return {
            _id: claims.sub || claims['custom:team_id'] || claims.email,
            email: claims.email,
            role: claims['custom:role'] || claims.role || 'user',
            teamId: claims['custom:team_id'] || claims.sub
        };
    }

    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return decoded;
        } catch (err) {
            const authError = new Error('Invalid or expired token');
            authError.statusCode = 401;
            throw authError;
        }
    }

    const missingAuthError = new Error('Authorization header is missing');
    missingAuthError.statusCode = 401;
    throw missingAuthError;
};

exports.logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        let user;
        try {
            user = extractUserFromEvent(event);
        } catch (err) {
            return {
                statusCode: err.statusCode || 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: err.message || 'Unauthorized' })
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' })
            };
        }

        let parsedBody;
        try {
            parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (err) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON body' })
            };
        }

        const validation = validateProgressInput(parsedBody);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: validation.message })
            };
        }

        const { teamId, updateText, deltaPercentage } = parsedBody;

        const project = await dynamoService.getProjectById(teamId);
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
                body: JSON.stringify({ message: 'Forbidden: Access denied to this project' })
            };
        }

        const logResult = await logProgress(teamId, updateText, deltaPercentage);

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                data: logResult
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

exports.getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        let user;
        try {
            user = extractUserFromEvent(event);
        } catch (err) {
            return {
                statusCode: err.statusCode || 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: err.message || 'Unauthorized' })
            };
        }

        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        const project = await dynamoService.getProjectById(teamId);
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
                body: JSON.stringify({ message: 'Forbidden: Access denied to this project' })
            };
        }

        const logs = await getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(logs || [])
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
