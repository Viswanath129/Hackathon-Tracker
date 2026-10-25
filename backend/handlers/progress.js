const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const headers = {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Content-Type': 'application/json'
};

const extractUser = (event) => {
    // Check if API Gateway authorizer claims are present
    if (event.requestContext && event.requestContext.authorizer) {
        const authorizer = event.requestContext.authorizer;
        if (authorizer.claims) {
            return {
                email: authorizer.claims.email,
                _id: authorizer.claims.sub || authorizer.claims['custom:team_id'],
                teamId: authorizer.claims['custom:team_id'] || authorizer.claims.sub,
                role: authorizer.claims['custom:role'] || 'user'
            };
        }
        if (authorizer.principalId) {
            return {
                email: authorizer.principalId,
                _id: authorizer.principalId,
                role: authorizer.role || 'user'
            };
        }
    }

    // Fallback: Verify JWT from Authorization header
    const authHeader = event.headers ? (event.headers.Authorization || event.headers.authorization) : null;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured');
        return null;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return {
            email: decoded.email,
            _id: decoded.id || decoded._id || decoded.sub,
            teamId: decoded.teamId || decoded._id || decoded.id,
            role: decoded.role || 'user'
        };
    } catch (err) {
        console.error('JWT verification error:', err);
        return null;
    }
};

const logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
    }

    try {
        const user = extractUser(event);
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized: Missing or invalid token' })
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Request body is missing' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseError) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON body' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: validation.error })
            };
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Verify project existence and ownership
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        if (!checkProjectOwnership(user, project)) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: You do not have access to this project' })
            };
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                data: result
            })
        };
    } catch (error) {
        console.error('Error in logUpdate handler:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
    }

    try {
        const user = extractUser(event);
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized: Missing or invalid token' })
            };
        }

        const teamId = event.pathParameters ? event.pathParameters.teamId : null;
        if (!teamId || teamId.trim() === '') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        if (!checkProjectOwnership(user, project)) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: You do not have access to this project' })
            };
        }

        const logs = await getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error('Error in getHistory handler:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = { logUpdate, getHistory };
