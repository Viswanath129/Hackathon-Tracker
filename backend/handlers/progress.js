const { logProgress, getProgressLogs } = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    console.log('[INFO] [logUpdate] Received event');

    try {
        if (!event.body) {
            return formatResponse(400, { message: 'Request body is missing' });
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return formatResponse(400, { message: 'Invalid JSON in request body' });
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Validation
        if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
            return formatResponse(400, { message: 'teamId is required and must be a non-empty string' });
        }
        if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
            return formatResponse(400, { message: 'updateText is required and must be a non-empty string' });
        }

        const delta = Number(deltaPercentage);
        if (isNaN(delta) || delta < -100 || delta > 100) {
            return formatResponse(400, { message: 'deltaPercentage must be a number between -100 and 100' });
        }

        console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);
        const result = await logProgress(teamId, updateText, delta);

        return formatResponse(201, {
            message: 'Progress logged successfully',
            ...result
        });
    } catch (error) {
        console.error('[ERROR] [logUpdate]', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    console.log('[INFO] [getHistory] Received event');

    try {
        const teamId = event.pathParameters ? event.pathParameters.teamId : null;

        if (!teamId) {
            return formatResponse(400, { message: 'teamId is required in path' });
        }

        console.log(`[INFO] [getHistory] Fetching progress logs for teamId: ${teamId}`);
        const logs = await getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error('[ERROR] [getHistory]', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
