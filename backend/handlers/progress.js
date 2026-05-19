const { logProgress, getProgressLogs } = require('../services/progressService');

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
};

exports.logUpdate = async (event) => {
    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
        const { projectId, updateText, deltaPercentage } = body;

        if (!projectId || !updateText) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'projectId and updateText are required' })
            };
        }

        if (deltaPercentage !== undefined) {
            const delta = parseFloat(deltaPercentage);
            if (isNaN(delta) || delta < 0 || delta > 100) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: 'deltaPercentage must be a numeric value between 0 and 100' })
                };
            }
        }

        const result = await logProgress(projectId, updateText, deltaPercentage);
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Error in logUpdate handler:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};

exports.getHistory = async (event) => {
    try {
        const { teamId } = event.pathParameters || {};

        if (!teamId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId path parameter is required' })
            };
        }

        // As per architecture, teamId in path parameter maps to projectId in the service layer
        const logs = await getProgressLogs(teamId);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error('Error in getHistory handler:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};
