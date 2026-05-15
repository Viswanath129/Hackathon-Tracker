const { logProgress, getProgressLogs } = require('../services/progressService');

/**
 * Common headers for API Gateway responses
 */
const HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
};

exports.logUpdate = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { projectId, updateText, deltaPercentage } = body;

        if (!projectId || !updateText) {
            return {
                statusCode: 400,
                headers: HEADERS,
                body: JSON.stringify({ message: 'projectId and updateText are required' })
            };
        }

        const result = await logProgress(projectId, updateText, deltaPercentage || 0);

        return {
            statusCode: 201,
            headers: HEADERS,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Error in logUpdate handler:', error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

exports.getHistory = async (event) => {
    try {
        // template.yaml defines path as /api/progress/{teamId}
        // We treat teamId as the projectId for progress tracking consistency
        const projectId = event.pathParameters ? event.pathParameters.teamId : null;

        if (!projectId) {
            return {
                statusCode: 400,
                headers: HEADERS,
                body: JSON.stringify({ message: 'projectId (teamId) is required' })
            };
        }

        const logs = await getProgressLogs(projectId);

        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error('Error in getHistory handler:', error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};
