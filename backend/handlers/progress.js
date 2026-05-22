const progressService = require('../services/progressService');

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

/**
 * Helper to parse event body
 */
const parseBody = (event) => {
    if (!event.body) return {};
    if (typeof event.body === 'object') return event.body;
    try {
        return JSON.parse(event.body);
    } catch (e) {
        return {};
    }
};

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    console.log(`[INFO] [logUpdate] Received request: ${event.body}`);
    const body = parseBody(event);
    const { teamId, updateText, deltaPercentage } = body;

    // Validation
    if (!teamId || !updateText) {
        console.error(`[ERROR] [logUpdate] Missing required fields: teamId or updateText`);
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Missing required fields: teamId or updateText' })
        };
    }

    if (deltaPercentage !== undefined) {
        const delta = parseFloat(deltaPercentage);
        if (isNaN(delta) || delta < 0 || delta > 100) {
            console.error(`[ERROR] [logUpdate] Invalid deltaPercentage: ${deltaPercentage}`);
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'deltaPercentage must be a number between 0 and 100' })
            };
        }
    }

    try {
        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);
        console.log(`[INFO] [logUpdate] Successfully logged progress for teamId: ${teamId}`);
        return {
            statusCode: 201,
            headers: CORS_HEADERS,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error(`[ERROR] [logUpdate] Internal error: ${error.message}`);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;
    console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);

    if (!teamId) {
        console.error(`[ERROR] [getHistory] Missing teamId in path parameters`);
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'teamId is required' })
        };
    }

    try {
        const logs = await progressService.getProgressLogs(teamId);
        console.log(`[INFO] [getHistory] Successfully retrieved ${logs.length} logs for teamId: ${teamId}`);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error(`[ERROR] [getHistory] Internal error: ${error.message}`);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};
