const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { verifyToken, checkProjectOwnership } = require('../utils/auth');

const buildHeaders = () => ({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Content-Type': 'application/json'
});

/**
 * AWS Lambda handler to log progress update.
 * Triggered by POST /api/progress/update
 */
const logUpdate = async (event) => {
    const headers = buildHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Authorization verification
    let user;
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    try {
        user = verifyToken(authHeader);
    } catch (err) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Unauthorized' })
        };
    }

    // Request body parsing
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
    } catch (err) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Invalid JSON body' })
        };
    }

    // Input validation
    const validation = validateProgressInput(body);
    if (!validation.isValid) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: validation.error })
        };
    }

    const { teamId, updateText, deltaPercentage } = body;

    try {
        // Project existence check
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        // BOLA Authorization check
        if (!checkProjectOwnership(user, teamId)) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: You do not have access to this project' })
            };
        }

        const result = await progressService.logProgress(teamId, updateText, Number(deltaPercentage));
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ message: 'Progress logged successfully', data: result })
        };
    } catch (error) {
        console.error('Lambda logUpdate internal error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * AWS Lambda handler to retrieve progress update history.
 * Triggered by GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const headers = buildHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Authorization verification
    let user;
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    try {
        user = verifyToken(authHeader);
    } catch (err) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Unauthorized' })
        };
    }

    const teamId = event.pathParameters?.teamId;
    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'teamId parameter is required' })
        };
    }

    try {
        // Project existence check
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        // BOLA Authorization check
        if (!checkProjectOwnership(user, teamId)) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: You do not have access to this project' })
            };
        }

        const logs = await progressService.getProgressLogs(teamId);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs || [])
        };
    } catch (error) {
        console.error('Lambda getHistory internal error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = {
    logUpdate,
    getHistory
};
