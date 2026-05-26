const { logProgress, getProgressLogs } = require('../services/progressService');

/**
 * Common CORS headers
 * This handler follows AWS Lambda function signatures (event-based) as part of the
 * architecture migration to AWS Serverless (Lambda + API Gateway).
 */
const HEADERS = {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
};

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    let body;
    try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (error) {
        console.error('[ERROR] [logUpdate] Failed to parse request body:', error.message);
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Invalid JSON in request body' })
        };
    }

    const { teamId, updateText, deltaPercentage } = body || {};

    // Log only necessary context for debugging to avoid PII or secret leaks
    console.log(`[INFO] [logUpdate] Request for teamId: ${teamId || 'unknown'}`);

    // Validation
    if (!teamId || !updateText) {
        console.warn('[WARN] [logUpdate] Missing required fields: teamId or updateText');
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'teamId and updateText are required' })
        };
    }

    let parsedDelta = undefined;
    if (deltaPercentage !== undefined) {
        parsedDelta = parseFloat(deltaPercentage);
        if (isNaN(parsedDelta) || parsedDelta < 0 || parsedDelta > 100) {
            console.warn(`[WARN] [logUpdate] Invalid deltaPercentage: ${deltaPercentage}`);
            return {
                statusCode: 400,
                headers: HEADERS,
                body: JSON.stringify({ message: 'deltaPercentage must be a number between 0 and 100' })
            };
        }
    }

    try {
        // teamId from API maps to projectId in service layer
        const result = await logProgress(teamId, updateText, parsedDelta);
        console.log(`[INFO] [logUpdate] Progress logged successfully for teamId: ${teamId}`);
        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error(`[ERROR] [logUpdate] Error logging progress for teamId: ${teamId}:`, error.message);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;

    if (!teamId) {
        console.warn('[WARN] [getHistory] teamId is missing in path parameters');
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'teamId is required' })
        };
    }

    console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);

    try {
        // teamId from API maps to projectId in service layer
        const logs = await getProgressLogs(teamId);
        console.log(`[INFO] [getHistory] Retrieved ${logs.length} logs for teamId: ${teamId}`);
        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error(`[ERROR] [getHistory] Error retrieving progress history for teamId: ${teamId}:`, error.message);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};
