const { logProgress, getProgressLogs } = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    try {
        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            console.error('[ERROR] [logUpdate] Failed to parse request body');
            return formatResponse(400, { message: 'Invalid JSON' });
        }

        if (!body) {
            return formatResponse(400, { message: 'Request body is missing' });
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Validation
        if (typeof teamId !== 'string' || teamId.trim() === '') {
            return formatResponse(400, { message: 'teamId is required and must be a string' });
        }
        if (typeof updateText !== 'string' || updateText.trim() === '') {
            return formatResponse(400, { message: 'updateText is required and must be a string' });
        }

        const delta = Number(deltaPercentage);
        if (isNaN(delta) || delta < -100 || delta > 100) {
            return formatResponse(400, { message: 'deltaPercentage must be a number between -100 and 100' });
        }

        console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);
        const result = await logProgress(teamId, updateText, delta);

        return formatResponse(201, result);
    } catch (error) {
        console.error(`[ERROR] [logUpdate] ${error.message}`);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    try {
        const teamId = event.pathParameters ? event.pathParameters.teamId : null;

        if (!teamId) {
            return formatResponse(400, { message: 'teamId path parameter is required' });
        }

        console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);
        const logs = await getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error(`[ERROR] [getHistory] ${error.message}`);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};
