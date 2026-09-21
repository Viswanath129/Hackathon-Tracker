const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership, verifyToken } = require('../utils/auth');

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const buildResponse = (statusCode, body) => ({
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
});

/**
 * Lambda handler for logging progress updates (POST /api/progress/update)
 */
const logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        if (!event.body) {
            return buildResponse(400, { message: 'Missing request body' });
        }

        let parsedBody;
        try {
            parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (err) {
            return buildResponse(400, { message: 'Invalid JSON format in request body' });
        }

        const validation = validateProgressInput(parsedBody);
        if (!validation.valid) {
            return buildResponse(400, { message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = parsedBody;

        console.log(`Processing progress log update for project: ${teamId}`);

        // Check project existence
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return buildResponse(404, { message: 'Project not found' });
        }

        // BOLA / Authorization check if auth header present or request user provided
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (authHeader) {
            const decoded = verifyToken(authHeader);
            if (!decoded) {
                return buildResponse(401, { message: 'Unauthorized: Invalid token' });
            }
            if (!checkProjectOwnership(decoded, project)) {
                return buildResponse(403, { message: 'Forbidden: You do not own this project' });
            }
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);

        return buildResponse(201, {
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Error logging progress update:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * Lambda handler for retrieving progress history (GET /api/progress/{teamId})
 */
const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
        if (!teamId) {
            return buildResponse(400, { message: 'teamId parameter is required' });
        }

        // Mandatory token authorization
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (!authHeader) {
            return buildResponse(401, { message: 'Unauthorized: Missing authorization header' });
        }

        const decoded = verifyToken(authHeader);
        if (!decoded) {
            return buildResponse(401, { message: 'Unauthorized: Token verification failed' });
        }

        console.log(`Fetching progress history for project: ${teamId}`);

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return buildResponse(404, { message: 'Project not found' });
        }

        if (!checkProjectOwnership(decoded, project)) {
            return buildResponse(403, { message: 'Forbidden: You do not own this project' });
        }

        const history = await progressService.getProgressLogs(teamId);

        return buildResponse(200, {
            message: 'Progress history retrieved successfully',
            data: history || []
        });
    } catch (error) {
        console.error('Error fetching progress history:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
