const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const progressService = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
});

const verifyToken = (event) => {
    const headers = event.headers || {};
    const authHeader = headers.Authorization || headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { errorStatus: 401, errorMessage: 'Unauthorized: Missing or invalid token' };
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        console.error('JWT_SECRET is not configured');
        return { errorStatus: 401, errorMessage: 'Unauthorized: Server security configuration missing' };
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        return { user: decoded };
    } catch (err) {
        return { errorStatus: 401, errorMessage: 'Unauthorized: Invalid token' };
    }
};

const logUpdate = async (event) => {
    const corsHeaders = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        const auth = verifyToken(event);
        if (auth.errorStatus) {
            return {
                statusCode: auth.errorStatus,
                headers: corsHeaders,
                body: JSON.stringify({ message: auth.errorMessage })
            };
        }

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
        } catch (parseErr) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON payload' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: validation.error })
            };
        }

        const { teamId, updateText, deltaPercentage } = body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        if (!checkProjectOwnership(auth.user, project, teamId)) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                timestamp: result.timestamp
            })
        };
    } catch (error) {
        console.error('Error logging progress update:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

const getHistory = async (event) => {
    const corsHeaders = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        const auth = verifyToken(event);
        if (auth.errorStatus) {
            return {
                statusCode: auth.errorStatus,
                headers: corsHeaders,
                body: JSON.stringify({ message: auth.errorMessage })
            };
        }

        const teamId = event.pathParameters && event.pathParameters.teamId;
        if (!teamId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'teamId parameter is required' })
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

        if (!checkProjectOwnership(auth.user, project, teamId)) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        const logs = await progressService.getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error('Error fetching progress history:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = { logUpdate, getHistory };
