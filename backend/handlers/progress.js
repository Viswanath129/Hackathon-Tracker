const { logProgress, getProgressLogs } = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    console.log('[INFO] [logUpdate] Starting logUpdate handler');
    try {
        let body;
        if (typeof event.body === 'string') {
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                return formatResponse(400, { message: 'Invalid JSON body' });
            }
        } else {
            body = event.body;
        }

        if (!body) {
            return formatResponse(400, { message: 'Missing request body' });
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Validation based on memory
        if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
            return formatResponse(400, { message: 'teamId must be a non-empty string' });
        }
        if (!updateText || typeof updateText !== 'string' || updateText.trim() === '') {
            return formatResponse(400, { message: 'updateText must be a non-empty string' });
        }

        const deltaNum = Number(deltaPercentage);
        if (isNaN(deltaNum) || deltaNum < -100 || deltaNum > 100) {
            return formatResponse(400, { message: 'deltaPercentage must be a numeric value between -100 and 100' });
        }

        console.log(`[INFO] [logUpdate] Logging update for teamId: ${teamId}`);
        const result = await logProgress(teamId, updateText, deltaNum);

        return formatResponse(201, {
            message: 'Progress logged successfully',
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error('[ERROR] [logUpdate]', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    console.log('[INFO] [getHistory] Starting getHistory handler');
    try {
        const teamId = event.pathParameters ? event.pathParameters.teamId : null;

        if (!teamId) {
            return formatResponse(400, { message: 'teamId path parameter is required' });
        }

        console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);
        const logs = await getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error('[ERROR] [getHistory]', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};
