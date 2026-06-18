const { logProgress, getProgressLogs } = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
const logUpdate = async (event) => {
    const handlerName = 'logUpdate';
    try {
        let body;
        if (typeof event.body === 'string') {
            try {
                body = JSON.parse(event.body);
            } catch (parseError) {
                return formatResponse(400, { message: 'Invalid JSON body' }, handlerName);
            }
        } else {
            body = event.body || {};
        }

        const { teamId, updateText, deltaPercentage } = body;

        if (!teamId || !updateText || deltaPercentage === undefined) {
            return formatResponse(400, { message: 'Missing required fields: teamId, updateText, deltaPercentage' }, handlerName);
        }

        const numericDelta = parseFloat(deltaPercentage);
        if (isNaN(numericDelta) || numericDelta < -100 || numericDelta > 100) {
            return formatResponse(400, { message: 'deltaPercentage must be a numeric value between -100 and 100' }, handlerName);
        }

        console.log(`[INFO] [${handlerName}] Logging progress for team: ${teamId}`);
        const result = await logProgress(teamId, updateText, numericDelta);

        return formatResponse(201, result, handlerName);
    } catch (error) {
        console.error(`[ERROR] [${handlerName}] Internal Error:`, error);
        return formatResponse(500, { message: 'Internal Server Error' }, handlerName);
    }
};

/**
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const handlerName = 'getHistory';
    try {
        const teamId = event.pathParameters?.teamId;

        if (!teamId) {
            return formatResponse(400, { message: 'teamId is required in path parameters' }, handlerName);
        }

        console.log(`[INFO] [${handlerName}] Fetching history for team: ${teamId}`);
        const logs = await getProgressLogs(teamId);

        return formatResponse(200, logs, handlerName);
    } catch (error) {
        console.error(`[ERROR] [${handlerName}] Internal Error:`, error);
        return formatResponse(500, { message: 'Internal Server Error' }, handlerName);
    }
};

module.exports = { logUpdate, getHistory };
