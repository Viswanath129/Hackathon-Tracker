const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { verifyToken, checkProjectOwnership } = require('../utils/auth');

const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const getHeader = (headers, headerName) => {
    if (!headers) return null;
    const lowerName = headerName.toLowerCase();
    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === lowerName) {
            return headers[key];
        }
    }
    return null;
};

/**
 * Lambda handler for POST /api/progress/update
 * Returns 201 Created on success
 */
exports.logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Request body is required' })
            };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Invalid JSON payload' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: validation.message })
            };
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Selective logging without PII/full event dump
        console.log(`Processing progress log update for teamId: ${teamId}`);

        // Extract auth token and perform BOLA verification
        const authHeader = getHeader(event.headers, 'authorization');
        const user = verifyToken(authHeader);

        // API Gateway Cognito Authorizer or local JWT verify
        const authorizerClaims = event.requestContext?.authorizer?.claims;

        let effectiveUser = user;
        if (!effectiveUser && authorizerClaims) {
            effectiveUser = {
                email: authorizerClaims.email,
                _id: authorizerClaims.sub,
                role: authorizerClaims['custom:role'] || 'user'
            };
        }

        if (!effectiveUser) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Unauthorized: Missing or invalid token' })
            };
        }

        const isAuthorized = await checkProjectOwnership(teamId, effectiveUser);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: Unauthorized access to project resource' })
            };
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                data: result
            })
        };
    } catch (error) {
        console.error('Unhandled error in logUpdate handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * Lambda handler for GET /api/progress/{teamId}
 * Returns 200 OK on success
 */
exports.getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;

        if (!teamId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        console.log(`Fetching progress history for teamId: ${teamId}`);

        const authHeader = getHeader(event.headers, 'authorization');
        const user = verifyToken(authHeader);
        const authorizerClaims = event.requestContext?.authorizer?.claims;

        let effectiveUser = user;
        if (!effectiveUser && authorizerClaims) {
            effectiveUser = {
                email: authorizerClaims.email,
                _id: authorizerClaims.sub,
                role: authorizerClaims['custom:role'] || 'user'
            };
        }

        if (!effectiveUser) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Unauthorized: Missing or invalid token' })
            };
        }

        const isAuthorized = await checkProjectOwnership(teamId, effectiveUser);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Forbidden: Unauthorized access to project resource' })
            };
        }

        const logs = await getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Progress history retrieved successfully',
                data: logs || []
            })
        };
    } catch (error) {
        console.error('Unhandled error in getHistory handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};
