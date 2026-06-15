const progressService = require('../services/progressService');
const { formatResponse } = require('./utils');

/**
 * POST /api/progress/update
 * Body: { teamId, projectId, updateText, deltaPercentage }
 */
const logUpdate = async (event) => {
    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { teamId, projectId, updateText, deltaPercentage } = body || {};

        // Validation
        if (!teamId || !projectId || !updateText || deltaPercentage === undefined) {
            return formatResponse(400, { message: 'Missing required fields: teamId, projectId, updateText, and deltaPercentage are required' });
        }

        const delta = parseFloat(deltaPercentage);
        if (isNaN(delta) || delta < 0 || delta > 100) {
            return formatResponse(400, { message: 'deltaPercentage must be a numeric value between 0 and 100' });
        }

        console.log(`[INFO] [logUpdate] Processing update for team: ${teamId}, project: ${projectId}`);

        const result = await progressService.logProgress(projectId, updateText, delta);

        return formatResponse(201, result);
    } catch (error) {
        console.error('[ERROR] [logUpdate] Unexpected error:', error);
        if (error instanceof SyntaxError) {
            return formatResponse(400, { message: 'Malformed JSON in request body' });
        }
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * GET /api/progress/{teamId}
 * Note: teamId in path parameter represents the Project ID for which history is requested
 */
const getHistory = async (event) => {
    try {
        // Mapping teamId path parameter to projectId as per DynamoDB schema
        const projectId = event.pathParameters?.teamId;

        if (!projectId) {
            return formatResponse(400, { message: 'Project ID is required (via teamId path parameter)' });
        }

        console.log(`[INFO] [getHistory] Fetching logs for project: ${projectId}`);

        const logs = await progressService.getProgressLogs(projectId);

        return formatResponse(200, logs);
    } catch (error) {
        console.error('[ERROR] [getHistory] Unexpected error:', error);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
