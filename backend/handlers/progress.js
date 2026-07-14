const { logProgress, getProgressLogs } = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * POST /api/progress/update
 * Handler for logging a new progress update.
 */
exports.logUpdate = async (event) => {
    if (!event.body) {
        return formatResponse(400, { message: 'Missing request body' });
    }

    let body;
    try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
        return formatResponse(400, { message: 'Invalid JSON in request body' });
    }

    const { teamId, updateText, deltaPercentage } = body;

    // Validation according to strict project rules
    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return formatResponse(400, { message: 'teamId is required and must be a non-empty string' });
    }
    if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
        return formatResponse(400, { message: 'updateText is required and must be a non-empty string' });
    }

    const delta = Number(deltaPercentage);
    if (deltaPercentage === undefined || deltaPercentage === null || isNaN(delta) || delta < -100 || delta > 100) {
        return formatResponse(400, { message: 'deltaPercentage must be a numeric value between -100 and 100' });
    }

    try {
        console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);
        await logProgress(teamId, updateText, delta);
        return formatResponse(201, { message: 'Progress logged successfully' });
    } catch (error) {
        console.error('[ERROR] [logUpdate]', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * GET /api/progress/{teamId}
 * Handler for retrieving progress history for a team.
 */
exports.getHistory = async (event) => {
    try {
        const teamId = event.pathParameters ? event.pathParameters.teamId : null;

        if (!teamId) {
            return formatResponse(400, { message: 'teamId is required in path parameters' });
        }

        console.log(`[INFO] [getHistory] Fetching progress history for teamId: ${teamId}`);
        const logs = await getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error('[ERROR] [getHistory]', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};
