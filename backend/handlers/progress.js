const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { verifyToken, checkProjectOwnership } = require('../utils/auth');

const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const getAuthUserFromEvent = (event) => {
    // 1. Check Cognito Authorizer claims in API Gateway context
    if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims) {
        const claims = event.requestContext.authorizer.claims;
        return {
            email: claims.email,
            sub: claims.sub,
            role: claims['custom:role'] || claims.role,
            teamId: claims['custom:teamId'] || claims.teamId
        };
    }

    // 2. Fallback to manual JWT verification from Authorization header
    const headers = event.headers || {};
    const authHeader = headers.Authorization || headers.authorization;
    if (authHeader) {
        return verifyToken(authHeader);
    }

    return null;
};

const logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    let user = getAuthUserFromEvent(event);
    if (!user) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Unauthorized: Missing or invalid token' })
        };
    }

    let body;
    try {
        body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    } catch (err) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Invalid JSON body' })
        };
    }

    const { teamId, updateText, deltaPercentage } = body;
    const validation = validateProgressInput(teamId, updateText, deltaPercentage);
    if (!validation.isValid) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: validation.message })
        };
    }

    try {
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        if (!checkProjectOwnership(user, project)) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: Access denied to project' })
            };
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                timestamp: result.timestamp,
                projectId: teamId
            })
        };
    } catch (error) {
        console.error('Error logging progress update in Lambda handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    let user = getAuthUserFromEvent(event);
    if (!user) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Unauthorized: Missing or invalid token' })
        };
    }

    const pathParameters = event.pathParameters || {};
    const teamId = pathParameters.teamId;

    if (!teamId) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'teamId path parameter is required' })
        };
    }

    try {
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Project not found' })
            };
        }

        if (!checkProjectOwnership(user, project)) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: Access denied to project' })
            };
        }

        const logs = await getProgressLogs(teamId);
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                projectId: teamId,
                logs: logs || []
            })
        };
    } catch (error) {
        console.error('Error fetching progress history in Lambda handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = {
    logUpdate,
    getHistory
};
