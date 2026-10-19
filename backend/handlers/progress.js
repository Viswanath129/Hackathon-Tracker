const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
};

const verifyTokenAndGetUser = async (event) => {
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured');
        return { user: null, errorStatus: 401, errorMessage: 'Unauthorized: Server authentication misconfigured' };
    }

    const headers = event.headers || {};
    const authHeader = headers.authorization || headers.Authorization || headers.AUTHORIZATION;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { user: null, errorStatus: 401, errorMessage: 'Not authorized, no token' };
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return { user: null, errorStatus: 401, errorMessage: 'Not authorized, token missing' };
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return { user: null, errorStatus: 401, errorMessage: 'Not authorized, token failed' };
    }

    if (!decoded || !decoded.email) {
        return { user: null, errorStatus: 401, errorMessage: 'Not authorized, invalid token payload' };
    }

    let user = await dynamoService.getUser(decoded.email);
    if (!user) {
        const allUsers = await dynamoService.getAllUsers();
        user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
    }

    if (!user) {
        return { user: null, errorStatus: 401, errorMessage: 'User not found in cloud' };
    }

    const { password, ...cleanUser } = user;
    return { user: { ...cleanUser, loginEmail: decoded.email } };
};

const logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        const authResult = await verifyTokenAndGetUser(event);
        if (!authResult.user) {
            return {
                statusCode: authResult.errorStatus || 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: authResult.errorMessage || 'Unauthorized' })
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' })
            };
        }

        let bodyData;
        try {
            bodyData = typeof event.body === 'object' ? event.body : JSON.parse(event.body);
        } catch (err) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON payload' })
            };
        }

        const validation = validateProgressInput(bodyData);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: validation.message })
            };
        }

        const { teamId, updateText, deltaPercentage } = bodyData;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        const isOwner = checkProjectOwnership(authResult.user, project);
        if (!isOwner) {
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
            body: JSON.stringify({ message: 'Progress update logged successfully', ...result })
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

const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        const authResult = await verifyTokenAndGetUser(event);
        if (!authResult.user) {
            return {
                statusCode: authResult.errorStatus || 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: authResult.errorMessage || 'Unauthorized' })
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

        const isOwner = checkProjectOwnership(authResult.user, project);
        if (!isOwner) {
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
            body: JSON.stringify(logs)
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
