const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET'
};

const verifyTokenAndGetUser = async (event) => {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = new Error('Not authorized, no token');
        error.statusCode = 401;
        throw error;
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is missing');
        }
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            const error = new Error('Not authorized, token failed');
            error.statusCode = 401;
            throw error;
        }
        throw err;
    }

    let user = await dynamoService.getUser(decoded.email);
    if (!user) {
        const allUsers = await dynamoService.getAllUsers();
        user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
    }

    if (!user) {
        const error = new Error('User not found in cloud');
        error.statusCode = 401;
        throw error;
    }

    const { password, ...cleanUser } = user;
    return { ...cleanUser, loginEmail: decoded.email };
};

const logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        const user = await verifyTokenAndGetUser(event);

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

        const validation = validateProgressInput(body);
        if (!validation.valid) {
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

        if (!checkProjectOwnership(user, project)) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: You do not own this project' })
            };
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);

        await dynamoService.saveActivity({
            action: 'PROGRESS_UPDATE',
            detail: `Logged progress update: ${updateText}`,
            email: user.email || user.loginEmail,
            team_name: user.team_name,
            icon: 'Activity'
        });

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                timestamp: result.timestamp
            })
        };
    } catch (error) {
        console.error('Lambda Log Update Error:', error);
        const statusCode = error.statusCode || 500;
        const message = statusCode === 500 ? 'Internal Server Error' : error.message;
        return {
            statusCode,
            headers: corsHeaders,
            body: JSON.stringify({ message })
        };
    }
};

const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        const user = await verifyTokenAndGetUser(event);

        const teamId = event.pathParameters?.teamId;
        if (!teamId || teamId.trim() === '') {
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

        if (!checkProjectOwnership(user, project)) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: You do not own this project' })
            };
        }

        const logs = await getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error('Lambda Get History Error:', error);
        const statusCode = error.statusCode || 500;
        const message = statusCode === 500 ? 'Internal Server Error' : error.message;
        return {
            statusCode,
            headers: corsHeaders,
            body: JSON.stringify({ message })
        };
    }
};

module.exports = { logUpdate, getHistory };
