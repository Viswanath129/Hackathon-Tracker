const { logProgress, getProgressLogs } = require('../services/progressService');

/**
 * Helper to create standardized Lambda responses
 */
const createResponse = (statusCode, body) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Adjusted per current project requirements
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    },
    body: JSON.stringify(body)
});

/**
 * Lambda handler for logging progress updates.
 * POST /api/progress/update
 */
exports.logUpdate = async (event, context, logProgressFn = logProgress) => {
    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { projectId, updateText, deltaPercentage } = body;

        if (!projectId || !updateText) {
            return createResponse(400, { message: 'projectId and updateText are required' });
        }

        const result = await logProgressFn(projectId, updateText, deltaPercentage || 0);

        return createResponse(201, result);
    } catch (error) {
        console.error('Error in logUpdate handler:', error);
        // Avoid leaking internal error details in production-grade code
        return createResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * Lambda handler for retrieving progress history.
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event, context, getProgressLogsFn = getProgressLogs) => {
    try {
        const { teamId } = event.pathParameters || {};

        if (!teamId) {
            return createResponse(400, { message: 'teamId (projectId) is required' });
        }

        const logs = await getProgressLogsFn(teamId);

        return createResponse(200, logs);
    } catch (error) {
        console.error('Error in getHistory handler:', error);
        return createResponse(500, { message: 'Internal Server Error' });
    }
};
