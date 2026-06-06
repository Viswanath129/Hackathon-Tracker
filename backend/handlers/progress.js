const { logProgress, getProgressLogs } = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * AWS Lambda handler to log progress update
 */
exports.logUpdate = async (event) => {
    try {
        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return formatResponse(400, { message: 'Invalid JSON body' });
        }

        if (!body) {
            return formatResponse(400, { message: 'Request body is missing' });
        }

        const { teamId, updateText, deltaPercentage } = body;

        if (!teamId || !updateText || deltaPercentage === undefined) {
            return formatResponse(400, { message: 'Missing required fields: teamId, updateText, deltaPercentage' });
        }

        const delta = parseFloat(deltaPercentage);
        if (isNaN(delta) || delta < 0 || delta > 100) {
            return formatResponse(400, { message: 'deltaPercentage must be a number between 0 and 100' });
        }

        console.log(`[INFO] [logUpdate] Logging progress for teamId: ${teamId}`);
        const result = await logProgress(teamId, updateText, delta);
        return formatResponse(201, result);
    } catch (error) {
        console.error('[ERROR] [logUpdate] Unexpected error:', error.message);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * AWS Lambda handler to retrieve progress history
 */
exports.getHistory = async (event) => {
    try {
        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            return formatResponse(400, { message: 'teamId is required' });
        }

        console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);
        const logs = await getProgressLogs(teamId);
        return formatResponse(200, logs);
    } catch (error) {
        console.error('[ERROR] [getHistory] Unexpected error:', error.message);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};
