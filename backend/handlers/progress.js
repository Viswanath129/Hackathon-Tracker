const { logProgress, getProgressLogs } = require('../services/progressService');

const HEADERS = {
    'Access-Control-Allow-Origin': '*', // In production, this should be restricted to the frontend domain
    'Access-Control-Allow-Credentials': true,
    'Content-Type': 'application/json'
};

/**
 * Lambda handler for logging progress updates.
 * POST /api/progress/update
 */
exports.logUpdate = async (event) => {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: HEADERS,
                body: JSON.stringify({ message: 'Missing request body' })
            };
        }

        const { projectId, updateText, deltaPercentage } = JSON.parse(event.body);

        if (!projectId || !updateText) {
            return {
                statusCode: 400,
                headers: HEADERS,
                body: JSON.stringify({ message: 'Missing projectId or updateText' })
            };
        }

        const result = await logProgress(projectId, updateText, deltaPercentage || 0);

        return {
            statusCode: 201,
            headers: HEADERS,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Error logging progress:', error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};

/**
 * Lambda handler for getting progress history.
 * GET /api/progress/{projectId}
 */
exports.getHistory = async (event) => {
    try {
        const projectId = event.pathParameters?.projectId;

        if (!projectId) {
            return {
                statusCode: 400,
                headers: HEADERS,
                body: JSON.stringify({ message: 'Missing projectId path parameter' })
            };
        }

        const logs = await getProgressLogs(projectId);

        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error('Error getting progress history:', error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};
