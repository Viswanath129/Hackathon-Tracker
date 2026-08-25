const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const progressService = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

/**
 * Helper to extract authenticated user from Lambda APIGateway Proxy Event
 */
async function getUserFromEvent(event) {
    // Check if API Gateway authorizer claims are present
    if (event && event.requestContext && event.requestContext.authorizer) {
        const claims = event.requestContext.authorizer.claims || event.requestContext.authorizer;
        if (claims && claims.email) {
            const user = await dynamoService.getUser(claims.email);
            if (user) return user;
            return { _id: claims.sub || claims._id, email: claims.email, role: claims.role || 'user' };
        }
    }

    // Fallback: Check Authorization header
    const headers = event ? (event.headers || {}) : {};
    const authHeader = headers.Authorization || headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = await dynamoService.getUser(decoded.email);
    if (!user) {
        const allUsers = await dynamoService.getAllUsers();
        user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
    }
    return user || null;
}

/**
 * Lambda handler for POST /api/progress/update
 * Handler name: handlers/progress.logUpdate
 */
exports.logUpdate = async (event) => {
    // Handle OPTIONS preflight
    if (event && event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        if (!event || !event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Missing request body' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (err) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON payload' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: validation.message })
            };
        }

        const { teamId, updateText, deltaPercentage } = body;

        let user;
        try {
            user = await getUserFromEvent(event);
        } catch (err) {
            console.error("Auth Token Verification Error:", err);
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid authentication token' })
            };
        }

        if (!user) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Not authorized, token missing or invalid' })
            };
        }

        console.log('Logging progress update for teamId:', teamId);

        const authCheck = await checkProjectOwnership(user, teamId);
        if (!authCheck.authorized) {
            return {
                statusCode: authCheck.statusCode || 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: authCheck.message })
            };
        }

        const numericDelta = Number(deltaPercentage);
        const result = await progressService.logProgress(teamId, updateText, numericDelta);

        // Update current project progress_percentage if project exists
        if (authCheck.project) {
            const project = authCheck.project;
            const newProgress = Math.max(0, Math.min(100, (project.progress_percentage || 0) + numericDelta));
            await dynamoService.saveProject(project.hackathon_id, {
                ...project,
                progress_percentage: newProgress
            });
        }

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                data: result
            })
        };
    } catch (error) {
        console.error('Error in logUpdate handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * Lambda handler for GET /api/progress/{teamId}
 * Handler name: handlers/progress.getHistory
 */
exports.getHistory = async (event) => {
    if (event && event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        const teamId = event && event.pathParameters && event.pathParameters.teamId;
        if (!teamId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        let user;
        try {
            user = await getUserFromEvent(event);
        } catch (err) {
            console.error("Auth Token Verification Error:", err);
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid authentication token' })
            };
        }

        if (!user) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Not authorized, token missing or invalid' })
            };
        }

        console.log('Fetching progress history for teamId:', teamId);

        const authCheck = await checkProjectOwnership(user, teamId);
        if (!authCheck.authorized) {
            return {
                statusCode: authCheck.statusCode || 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: authCheck.message })
            };
        }

        const logs = await progressService.getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(logs || [])
        };
    } catch (error) {
        console.error('Error in getHistory handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};
