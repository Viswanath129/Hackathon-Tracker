const progressService = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 *
 * Maps teamId to projectId in the service layer.
 */
exports.logUpdate = async (event) => {
    let body;
    try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (error) {
        return formatResponse(400, { message: 'Invalid JSON body' });
    }

    const { teamId, updateText, deltaPercentage } = body || {};

    if (!teamId || !updateText || deltaPercentage === undefined) {
        return formatResponse(400, { message: 'Missing required fields: teamId, updateText, deltaPercentage' });
    }

    const parsedDelta = parseFloat(deltaPercentage);
    if (isNaN(parsedDelta) || parsedDelta < 0 || parsedDelta > 100) {
        return formatResponse(400, { message: 'deltaPercentage must be a number between 0 and 100' });
    }

    console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);

    try {
        const result = await progressService.logProgress(teamId, updateText, parsedDelta);
        return formatResponse(201, result);
    } catch (error) {
        console.error('[ERROR] [logUpdate]', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * GET /api/progress/{teamId}
 *
 * Extracts teamId from path parameters.
 */
exports.getHistory = async (event) => {
    const { teamId } = event.pathParameters || {};

    if (!teamId) {
        return formatResponse(400, { message: 'Missing teamId in path' });
    }

    console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);

    try {
        const logs = await progressService.getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error('[ERROR] [getHistory]', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};
