const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { formatResponse } = require('./utils');

/**
 * AWS Lambda handler to log a progress update.
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    try {
        console.log('[INFO] [logUpdate] Progress log update Lambda execution started.');

        if (!event || !event.body) {
            console.warn('[WARN] [logUpdate] Request body is missing.');
            return formatResponse(400, { message: 'Bad Request: Request body is missing' });
        }

        let body;
        if (typeof event.body === 'string') {
            try {
                body = JSON.parse(event.body);
            } catch (error) {
                console.error(`[ERROR] [logUpdate] Failed to parse JSON body: ${error.message}`);
                return formatResponse(400, { message: 'Bad Request: Invalid JSON body' });
            }
        } else {
            body = event.body;
        }

        const { teamId, updateText, deltaPercentage } = body || {};

        console.log(`[INFO] [logUpdate] Received progress update request for teamId: ${teamId}`);

        const validation = validateProgressInput({ teamId, updateText, deltaPercentage });
        if (!validation.isValid) {
            console.warn(`[WARN] [logUpdate] Input validation failed for teamId ${teamId}: ${JSON.stringify(validation.errors)}`);
            return formatResponse(400, { message: 'Bad Request', errors: validation.errors });
        }

        // teamId maps to projectId in the service layer
        const result = await logProgress(teamId, updateText, deltaPercentage);

        console.log(`[INFO] [logUpdate] Successfully logged progress for teamId: ${teamId}`);
        return formatResponse(201, { success: true, message: 'Progress logged successfully', ...result });

    } catch (error) {
        console.error(`[ERROR] [logUpdate] Handler exception occurred: ${error.message}`, error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * AWS Lambda handler to retrieve progress history.
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    try {
        console.log('[INFO] [getHistory] Get progress history Lambda execution started.');

        const teamId = event && event.pathParameters && event.pathParameters.teamId;
        if (!teamId) {
            console.warn('[WARN] [getHistory] Path parameter teamId is missing.');
            return formatResponse(400, { message: 'Bad Request: Missing teamId path parameter' });
        }

        console.log(`[INFO] [getHistory] Fetching progress logs for teamId: ${teamId}`);

        // teamId maps to projectId in the service layer
        const logs = await getProgressLogs(teamId);

        console.log(`[INFO] [getHistory] Successfully retrieved ${logs.length} logs for teamId: ${teamId}`);
        return formatResponse(200, logs);

    } catch (error) {
        console.error(`[ERROR] [getHistory] Handler exception occurred: ${error.message}`, error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
