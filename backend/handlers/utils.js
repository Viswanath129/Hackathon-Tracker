const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');

const getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
});

const buildResponse = (statusCode, body) => ({
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify(body),
});

const authenticateEvent = async (event) => {
    // Check requestContext authorizer (Cognito)
    const authorizer = event.requestContext && event.requestContext.authorizer;
    if (authorizer) {
        const claims = authorizer.claims || (authorizer.jwt && authorizer.jwt.claims);
        if (claims) {
            const email = claims.email || claims['cognito:username'];
            if (email) {
                let user = await dynamoService.getUser(email);
                if (!user) {
                    user = {
                        email,
                        _id: claims.sub || claims.user_id,
                        role: claims['custom:role'] || claims.role || 'user',
                    };
                }
                return user;
            }
        }
    }

    // Check Authorization header for JWT token
    const authHeader = event.headers && (event.headers.Authorization || event.headers.authorization);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('JWT_SECRET is unconfigured in environment');
        return null;
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, secret);

        let user = await dynamoService.getUser(decoded.email);
        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
        }

        if (!user && decoded.email) {
            user = {
                email: decoded.email,
                _id: decoded.id || decoded._id || decoded.sub,
                role: decoded.role || 'user',
            };
        }

        if (user) {
            return { ...user, loginEmail: decoded.email };
        }
        return null;
    } catch (error) {
        console.error('JWT verification failed:', error.message);
        return null;
    }
};

module.exports = {
    getCorsHeaders,
    buildResponse,
    authenticateEvent,
};
