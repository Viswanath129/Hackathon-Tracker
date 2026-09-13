const jwt = require('jsonwebtoken');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const getCorsHeaders = () => {
    const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    };
};

const verifyToken = (authHeader) => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
        console.error('JWT_SECRET environment variable is not configured');
        return null;
    }

    if (!authHeader) {
        return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
    }

    const token = parts[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (err) {
        console.error('JWT Verification Error:', err.message);
        return null;
    }
};

/**
 * Lambda handler: POST /api/progress/update
 */
const logUpdate = async (event) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
    }

    let body;
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid or missing JSON request body' })
            };
        }
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (err) {
        console.error('JSON Parse Error:', err.message);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid or missing JSON request body' })
        };
    }

    const validation = validateProgressInput(body);
    if (!validation.isValid) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: validation.error })
        };
    }

    // Authorization
    const authHeader = event.headers ? (event.headers.Authorization || event.headers.authorization) : null;
    const user = verifyToken(authHeader);
    if (!user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized: Invalid or missing token' })
        };
    }

    // BOLA Check
    if (!checkProjectOwnership(user, body.teamId)) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden: You do not have permission for this project' })
        };
    }

    // Selective logging to avoid printing full event or PII
    console.log('Logging progress update for teamId:', body.teamId);

    try {
        const result = await logProgress(body.teamId, body.updateText, Number(body.deltaPercentage));
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Progress update logged successfully',
                data: result
            })
        };
    } catch (err) {
        console.error('Progress Log Update Error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};

/**
 * Lambda handler: GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
    }

    const pathParameters = event.pathParameters || {};
    const teamId = pathParameters.teamId || pathParameters.id;

    if (!teamId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'teamId path parameter is required' })
        };
    }

    // Authorization
    const authHeader = event.headers ? (event.headers.Authorization || event.headers.authorization) : null;
    const user = verifyToken(authHeader);
    if (!user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized: Invalid or missing token' })
        };
    }

    // BOLA Check
    if (!checkProjectOwnership(user, teamId)) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden: You do not have permission for this project' })
        };
    }

    // Selective logging
    console.log('Fetching progress history for teamId:', teamId);

    try {
        const logs = await getProgressLogs(teamId);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: logs
            })
        };
    } catch (err) {
        console.error('Get Progress History Error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};

module.exports = { logUpdate, getHistory };
