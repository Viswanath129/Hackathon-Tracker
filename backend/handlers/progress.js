const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { formatResponse } = require('./utils');

/**
 * Helper to parse body from API Gateway event
 */
const parseBody = (event) => {
    if (!event.body) {
        return null;
    }
    if (typeof event.body === 'object') {
        return event.body;
    }
    try {
        return JSON.parse(event.body);
    } catch (error) {
        throw new Error('Invalid JSON');
    }
};

/**
 * Lambda handler: POST /api/progress/update
 */
const logUpdate = async (event, context) => {
    try {
        let body;
        try {
            body = parseBody(event);
        } catch (err) {
            console.error('[ERROR] [logUpdate] Failed to parse request body:', err);
            return formatResponse(400, { message: 'Invalid JSON request body' });
        }

        if (!body) {
            console.warn('[WARN] [logUpdate] Request body is missing');
            return formatResponse(400, { message: 'Request body is missing' });
        }

        const { teamId, updateText, deltaPercentage } = body;
        console.log(`[INFO] [logUpdate] Received progress log update request for teamId: ${teamId || 'unknown'}`);

        // Validate the input
        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            console.warn(`[WARN] [logUpdate] Validation failed for teamId: ${teamId || 'unknown'}. Errors: ${validation.errors.join(', ')}`);
            return formatResponse(400, { message: 'Validation Failed', errors: validation.errors });
        }

        // Call progressService passing teamId as the projectId
        const result = await logProgress(teamId, updateText, deltaPercentage);
        console.log(`[INFO] [logUpdate] Successfully logged progress for teamId: ${teamId}`);

        return formatResponse(201, result);
    } catch (error) {
        console.error('[ERROR] [logUpdate] Detailed Internal Error:', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * Lambda handler: GET /api/progress/{teamId}
 */
const getHistory = async (event, context) => {
    try {
        const teamId = event.pathParameters ? event.pathParameters.teamId : null;

        if (!teamId || teamId.trim() === '') {
            console.warn('[WARN] [getHistory] teamId path parameter is missing');
            return formatResponse(400, { message: 'teamId parameter is required' });
        }

        console.log(`[INFO] [getHistory] Fetching progress logs for teamId: ${teamId}`);

        const logs = await getProgressLogs(teamId);
        console.log(`[INFO] [getHistory] Successfully retrieved progress logs for teamId: ${teamId}`);

        return formatResponse(200, logs);
    } catch (error) {
        console.error('[ERROR] [getHistory] Detailed Internal Error:', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
