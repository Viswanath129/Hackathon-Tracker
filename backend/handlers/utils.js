const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');

const getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
});

const createResponse = (statusCode, body) => ({
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify(body)
});

const getHeader = (headers, name) => {
    if (!headers) return null;
    const lowerName = name.toLowerCase();
    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === lowerName) {
            return headers[key];
        }
    }
    return null;
};

const verifyToken = async (event) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.trim() === '') {
        console.error("JWT_SECRET environment variable is not configured.");
        return null;
    }

    const authHeader = getHeader(event.headers, 'Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, jwtSecret);
        if (!decoded || !decoded.email) {
            return null;
        }

        let user = await dynamoService.getUser(decoded.email);
        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
        }

        if (!user) {
            return null;
        }

        const { password, ...cleanUser } = user;
        return { ...cleanUser, loginEmail: decoded.email };
    } catch (error) {
        console.error("Token Verification Error:", error.message);
        return null;
    }
};

module.exports = {
    getCorsHeaders,
    createResponse,
    getHeader,
    verifyToken
};
