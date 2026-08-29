const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { verifyToken, checkProjectOwnership } = require('../utils/auth');

const buildCorsHeaders = () => {
    return {
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Content-Type': 'application/json'
    };
};

const extractUser = (event) => {
    // Check API Gateway Cognito authorizer context
    if (event.requestContext && event.requestContext.authorizer) {
        const auth = event.requestContext.authorizer;
        const claims = auth.claims || auth;
        if (claims && (claims.email || claims.sub)) {
            return {
                _id: claims.sub || claims.username || claims['cognito:username'],
                email: claims.email,
                role: claims['custom:role'] || claims.role || 'user'
            };
        }
    }

    // Check Authorization header for JWT token
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (authHeader) {
        const decoded = verifyToken(authHeader);
        return decoded;
    }

    return null;
};

/**
 * Handler for POST /api/progress/update
 */
const logUpdate = async (event) => {
    const headers = buildCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
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
                body: JSON.stringify({ message: 'Invalid JSON body' })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: validation.message })
            };
        }

        const teamId = body.teamId || body.projectId;
        const updateText = body.updateText || body.update_text;
        const deltaPercentage = Number(body.deltaPercentage !== undefined ? body.deltaPercentage : body.delta_percentage);

        // Selective logging without leaking sensitive information
        console.log(`Processing progress update for teamId: ${teamId}`);

        let user;
        try {
            user = extractUser(event);
        } catch (authError) {
            console.error('Authentication Error:', authError.message);
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: authError.message || 'Unauthorized' })
            };
        }

        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized: Missing or invalid authentication credentials' })
            };
        }

        const isAuthorized = await checkProjectOwnership(user, teamId);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access denied for project' })
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
        console.error('Progress Log Error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * Handler for GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const headers = buildCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
    }

    try {
        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
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
            user = extractUser(event);
        } catch (authError) {
            console.error('Authentication Error:', authError.message);
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: authError.message || 'Unauthorized' })
            };
        }

        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Unauthorized: Missing or invalid authentication credentials' })
            };
        }

        const isAuthorized = await checkProjectOwnership(user, teamId);
        if (!isAuthorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'Forbidden: Access denied for project' })
            };
        }

        const logs = await getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs || [])
        };
    } catch (error) {
        console.error('Progress History Error:', error.message);
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
