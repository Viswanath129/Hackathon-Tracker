const progressService = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 * Note: teamId maps to projectId in the service layer
 */
exports.logUpdate = async (event) => {
    console.log('[INFO] [logUpdate] Starting progress log update');

    try {
        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            console.error('[ERROR] [logUpdate] Failed to parse request body');
            return formatResponse(400, { message: 'Invalid JSON' });
        }

        const { teamId, updateText, deltaPercentage } = body || {};

        if (!teamId || !updateText || deltaPercentage === undefined) {
            return formatResponse(400, { message: 'Missing required fields: teamId, updateText, deltaPercentage' });
        }

        const parsedDelta = parseFloat(deltaPercentage);
        if (isNaN(parsedDelta) || parsedDelta < -100 || parsedDelta > 100) {
            return formatResponse(400, { message: 'deltaPercentage must be a numeric value between -100 and 100' });
        }

        console.log(`[INFO] [logUpdate] Logging progress for project: ${teamId}`);
        const result = await progressService.logProgress(teamId, updateText, parsedDelta);

        return formatResponse(201, result);
    } catch (error) {
        console.error('[ERROR] [logUpdate]', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    console.log('[INFO] [getHistory] Fetching progress history');

    try {
        const teamId = event.pathParameters?.teamId;

        if (!teamId) {
            return formatResponse(400, { message: 'teamId path parameter is required' });
        }

        console.log(`[INFO] [getHistory] Fetching logs for project: ${teamId}`);
        const logs = await progressService.getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error('[ERROR] [getHistory]', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};
