const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { getCorsHeaders } = require('./utils');

/**
 * Validates token signature and returns user payload or null if unauthorized.
 */
function verifyToken(event) {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const claims = event.requestContext?.authorizer?.claims;
        if (claims) {
            return {
                email: claims.email,
                role: claims['custom:role'] || claims.role || 'team',
                teamId: claims['custom:teamId'] || claims.sub
            };
        }
        return null;
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
        console.error('JWT_SECRET is not configured.');
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (err) {
        console.error('JWT Verification Error:', err.message);
        return null;
    }
}

/**
 * Lambda handler for logging progress updates (POST /api/progress/update)
 */
const logUpdate = async (event) => {
    const headers = getCorsHeaders();

    const httpMethod = event.httpMethod || event.requestContext?.http?.method;
    if (httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing request body' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseError) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON request body' })
            };
        }

        if (body && body.teamId) {
            console.log(`Processing progress log update for teamId: ${body.teamId}`);
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: validation.error })
            };
        }

        const user = verifyToken(event);
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        if (user.role !== 'admin') {
            const userTeamId = user.teamId || user._id;
            if (!userTeamId || userTeamId !== body.teamId) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ message: 'Forbidden: Unauthorized access to specified project' })
                };
            }
        }

        const { teamId, updateText, deltaPercentage } = body;
        const result = await logProgress(teamId, updateText, Number(deltaPercentage));

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

/**
 * Lambda handler for retrieving progress update history (GET /api/progress/{teamId})
 */
const getHistory = async (event) => {
    const headers = getCorsHeaders();

    const httpMethod = event.httpMethod || event.requestContext?.http?.method;
    if (httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing teamId parameter' })
            };
        }

        console.log(`Retrieving progress history for teamId: ${teamId}`);

        const user = verifyToken(event);
        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized' })
            };
        }

        if (user.role !== 'admin') {
            const userTeamId = user.teamId || user._id;
            if (!userTeamId || userTeamId !== teamId) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ message: 'Forbidden: Unauthorized access to specified project' })
                };
            }
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
