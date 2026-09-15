const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    };
}

async function getAuthUser(event) {
    const headers = event.headers || {};
    const authHeader = headers.authorization || headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET) {
        return null;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.email) return null;
        let user = await dynamoService.getUser(decoded.email);
        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
        }
        return user || null;
    } catch (err) {
        return null;
    }
}

const logUpdate = async (event) => {
    const headers = getHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        if (!event.body) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: 'Request body missing' }) };
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: 'Invalid JSON body' }) };
        }

        const validation = validateProgressInput(body);
        if (!validation.valid) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: validation.message }) };
        }

        const user = await getAuthUser(event);
        if (!user) {
            return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) };
        }

        const { teamId, updateText, deltaPercentage } = body;
        console.log(`Processing progress update for teamId: ${teamId}`);

        const authCheck = await checkProjectOwnership(user, teamId);
        if (authCheck.notFound) {
            return { statusCode: 404, headers, body: JSON.stringify({ message: 'Project not found' }) };
        }
        if (!authCheck.authorized) {
            return { statusCode: 403, headers, body: JSON.stringify({ message: 'Forbidden' }) };
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ message: 'Progress logged successfully', data: result })
        };
    } catch (error) {
        console.error('Error logging update:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

const getHistory = async (event) => {
    const headers = getHeaders();

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: 'teamId parameter is required' }) };
        }

        const user = await getAuthUser(event);
        if (!user) {
            return { statusCode: 401, headers, body: JSON.stringify({ message: 'Unauthorized' }) };
        }

        console.log(`Fetching progress history for teamId: ${teamId}`);

        const authCheck = await checkProjectOwnership(user, teamId);
        if (authCheck.notFound) {
            return { statusCode: 404, headers, body: JSON.stringify({ message: 'Project not found' }) };
        }
        if (!authCheck.authorized) {
            return { statusCode: 403, headers, body: JSON.stringify({ message: 'Forbidden' }) };
        }

        const logs = await getProgressLogs(teamId);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Progress history retrieved', data: logs })
        };
    } catch (error) {
        console.error('Error retrieving history:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

module.exports = { logUpdate, getHistory };
