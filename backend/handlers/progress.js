const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { getCorsHeaders } = require('./utils');

/**
 * Verify JWT token from event headers
 */
const verifyToken = async (event) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET configuration missing');
    }

    const headers = event.headers || {};
    const authHeader = headers.Authorization || headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user = await dynamoService.getUser(decoded.email);
        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(u => u.members && u.members.some(m => m.email === decoded.email));
        }
        if (!user) {
            return { email: decoded.email, role: decoded.role, _id: decoded.id || decoded._id };
        }
        return user;
    } catch (err) {
        return null;
    }
};

/**
 * Lambda handler for logging progress updates
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    const headers = getCorsHeaders();

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing request body' })
            };
        }

        let payload;
        try {
            payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid JSON body' })
            };
        }

        const validation = validateProgressInput(payload);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: validation.error })
            };
        }

        const { teamId, updateText, deltaPercentage } = validation.data;
        console.log(`Processing progress update for teamId: ${teamId}`);

        let user;
        try {
            user = await verifyToken(event);
        } catch (configError) {
            console.error('Auth configuration error:', configError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ message: 'Internal Server Error' })
            };
        }

        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized' })
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

        // BOLA Verification: Only project owner or admin can log updates
        const isAdmin = user.role === 'admin';
        const isOwner = project.team_id === user._id || project.email === user.email || (user.email && project.PK === `USER#${user.email.toLowerCase()}`);

        if (!isAdmin && !isOwner) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access denied for this project' })
            };
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                timestamp: result.timestamp
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
 * Lambda handler for retrieving progress history
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const headers = getCorsHeaders();

    try {
        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        console.log(`Fetching progress history for teamId: ${teamId}`);

        let user;
        try {
            user = await verifyToken(event);
        } catch (configError) {
            console.error('Auth configuration error:', configError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ message: 'Internal Server Error' })
            };
        }

        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized' })
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

        // BOLA Verification
        const isAdmin = user.role === 'admin';
        const isOwner = project.team_id === user._id || project.email === user.email || (user.email && project.PK === `USER#${user.email.toLowerCase()}`);

        if (!isAdmin && !isOwner) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access denied for this project' })
            };
        }

        const logs = await getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs || [])
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
