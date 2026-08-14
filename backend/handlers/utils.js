const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');

const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

const buildResponse = (statusCode, body, extraHeaders = {}) => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
            ...extraHeaders
        },
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };
};

const verifyToken = async (event) => {
    if (!process.env.JWT_SECRET) {
        const error = new Error('JWT_SECRET is not configured');
        error.statusCode = 500;
        throw error;
    }

    const headers = event ? (event.headers || {}) : {};
    const authHeader = headers.authorization || headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = new Error('Not authorized, missing or invalid token format');
        error.statusCode = 401;
        throw error;
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        const error = new Error('Not authorized, token validation failed');
        error.statusCode = 401;
        throw error;
    }

    let user = await dynamoService.getUser(decoded.email);
    if (!user) {
        const allUsers = await dynamoService.getAllUsers();
        user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
    }

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 401;
        throw error;
    }

    return { decoded, user };
};

const verifyProjectAccess = async (user, projectId) => {
    const project = await dynamoService.getProjectById(projectId);
    if (!project) {
        return { authorized: false, reason: 'notFound', project: null };
    }

    if (user.role === 'admin') {
        return { authorized: true, project };
    }

    if (project.team_id === user._id || project.user_id === user._id) {
        return { authorized: true, project };
    }

    return { authorized: false, reason: 'forbidden', project };
};

module.exports = {
    corsHeaders,
    buildResponse,
    verifyToken,
    verifyProjectAccess
};
