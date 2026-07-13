const { logProgress, getProgressLogs } = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    console.log('[INFO] [logUpdate] Starting progress update log');

    let body;
    try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (error) {
        return formatResponse(400, { message: 'Invalid JSON' });
    }

    if (!body) {
        return formatResponse(400, { message: 'Missing request body' });
    }

    const { teamId, updateText, deltaPercentage } = body;

    // Validation
    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return formatResponse(400, { message: 'teamId is required' });
    }
    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return formatResponse(400, { message: 'updateText is required' });
    }
    const delta = Number(deltaPercentage);
    if (isNaN(delta) || delta < -100 || delta > 100) {
        return formatResponse(400, { message: 'deltaPercentage must be a number between -100 and 100' });
    }

    try {
        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await logProgress(teamId, updateText, delta);
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

    const teamId = event.pathParameters?.teamId;

    if (!teamId) {
        return formatResponse(400, { message: 'teamId parameter is required' });
    }

    try {
        console.log(`[INFO] [getHistory] Fetching history for team: ${teamId}`);
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error('[ERROR] [getHistory]', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};
