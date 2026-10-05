const jwt = require('jsonwebtoken');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');
const dynamoService = require('../services/dynamoService');
const progressService = require('../services/progressService');

const getCORSHeaders = () => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173'
});

const authenticateUser = async (event) => {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { user: null, errorStatus: 401, errorMessage: 'Not authorized, no token' };
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('JWT_SECRET is not configured in process.env');
        return { user: null, errorStatus: 401, errorMessage: 'Not authorized, token failed' };
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, secret);

        let user = await dynamoService.getUser(decoded.email);
        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
        }

        if (!user) {
            return { user: null, errorStatus: 401, errorMessage: 'User not found' };
        }

        return { user: { ...user, loginEmail: decoded.email } };
    } catch (err) {
        console.error('Lambda token verification failed:', err.message);
        return { user: null, errorStatus: 401, errorMessage: 'Not authorized, token failed' };
    }
};

/**
 * Lambda Handler: logUpdate
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    const headers = getCORSHeaders();

    try {
        // Authenticate request
        const auth = await authenticateUser(event);
        if (auth.errorStatus) {
            return {
                statusCode: auth.errorStatus,
                headers,
                body: JSON.stringify({ message: auth.errorMessage })
            };
        }

        // Parse event body
        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Request body missing' })
            };
        }

        let data;
        try {
            data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON body' })
            };
        }

        // Validate input
        const validation = validateProgressInput(data);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: validation.message })
            };
        }

        const teamId = data.teamId || data.projectId;
        const { updateText, deltaPercentage } = data;

        // Fetch project to verify existence and check BOLA ownership
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        const isAuthorized = checkProjectOwnership(auth.user, project);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access denied' })
            };
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ message: 'Progress update logged successfully', ...result })
        };
    } catch (error) {
        console.error('Lambda logUpdate error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * Lambda Handler: getHistory
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const headers = getCORSHeaders();

    try {
        // Enforce mandatory token authorization
        const auth = await authenticateUser(event);
        if (auth.errorStatus) {
            return {
                statusCode: auth.errorStatus,
                headers,
                body: JSON.stringify({ message: auth.errorMessage })
            };
        }

        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
        if (!teamId || typeof teamId !== 'string' || teamId.trim().length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        // Fetch project to verify existence and check BOLA ownership
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        const isAuthorized = checkProjectOwnership(auth.user, project);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access denied' })
            };
        }

        const logs = await progressService.getProgressLogs(teamId);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error('Lambda getHistory error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = { logUpdate, getHistory };
