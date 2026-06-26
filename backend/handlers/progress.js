const progressService = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
const logUpdate = async (event) => {
    try {
        console.log('[INFO] [logUpdate] Parsing request body');
        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return formatResponse(400, { message: 'Invalid JSON body' });
        }

        if (!body) {
            return formatResponse(400, { message: 'Request body is required' });
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Validation: Ensure teamId and updateText are non-empty strings
        if (typeof teamId !== 'string' || !teamId.trim()) {
            return formatResponse(400, { message: 'teamId must be a non-empty string' });
        }
        if (typeof updateText !== 'string' || !updateText.trim()) {
            return formatResponse(400, { message: 'updateText must be a non-empty string' });
        }

        // Strict numeric validation for deltaPercentage
        const parsedDelta = Number(deltaPercentage);
        if (
            deltaPercentage === null ||
            deltaPercentage === '' ||
            Array.isArray(deltaPercentage) ||
            isNaN(parsedDelta) ||
            parsedDelta < -100 ||
            parsedDelta > 100
        ) {
            return formatResponse(400, { message: 'deltaPercentage must be a numeric value between -100 and 100' });
        }

        console.log(`[INFO] [logUpdate] Logging progress for team: ${teamId}`);
        const result = await progressService.logProgress(teamId, updateText, parsedDelta);

        return formatResponse(201, result);
    } catch (error) {
        console.error('[ERROR] [logUpdate]', error);
        return formatResponse(500, { message: error.message });
    }
};

/**
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    try {
        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            return formatResponse(400, { message: 'Missing teamId in path parameters' });
        }

        console.log(`[INFO] [getHistory] Fetching history for team: ${teamId}`);
        const logs = await progressService.getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error('[ERROR] [getHistory]', error);
        return formatResponse(500, { message: error.message });
    }
};

module.exports = { logUpdate, getHistory };
