const progressService = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * Lambda handler for logging progress updates.
 * POST /api/progress/update
 */
exports.logUpdate = async (event) => {
    console.log('[INFO] [logUpdate] Received progress update request');

    try {
        let body;
        if (typeof event.body === 'string') {
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                console.error('[ERROR] [logUpdate] Malformed JSON in request body');
                return formatResponse(400, { message: 'Invalid JSON in request body' });
            }
        } else {
            body = event.body;
        }

        const { teamId, updateText, deltaPercentage } = body || {};

        if (!teamId || !updateText) {
            return formatResponse(400, { message: 'Missing required fields: teamId and updateText' });
        }

        // Validate deltaPercentage
        if (deltaPercentage !== undefined) {
            const numDelta = Number(deltaPercentage);
            if (isNaN(numDelta) || numDelta < 0 || numDelta > 100) {
                return formatResponse(400, { message: 'deltaPercentage must be a number between 0 and 100' });
            }
        }

        console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);
        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);

        return formatResponse(201, result);
    } catch (error) {
        console.error('[ERROR] [logUpdate] Internal Server Error:', error.message);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * Lambda handler for fetching progress history.
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;
    console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);

    if (!teamId) {
        return formatResponse(400, { message: 'Missing teamId parameter' });
    }

    try {
        const logs = await progressService.getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error('[ERROR] [getHistory] Internal Server Error:', error.message);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};
