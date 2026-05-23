const progressService = require('../services/progressService');

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
};

/**
 * Handler for POST /api/progress/update
 * Body: { teamId (projectId), updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    console.log('[INFO] [logUpdate] Event received:', JSON.stringify(event));

    try {
        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
        } catch (parseError) {
            console.error('[ERROR] [logUpdate] Malformed JSON in request body:', parseError);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Malformed JSON in request body' })
            };
        }

        const { teamId, updateText, deltaPercentage } = body;

        // teamId maps to projectId in the service layer
        if (!teamId || !updateText) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing required fields: teamId and updateText' })
            };
        }

        // Validation for deltaPercentage: numeric value between 0 and 100
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

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('[ERROR] [logUpdate] Error logging progress:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};

/**
 * Handler for GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    console.log('[INFO] [getHistory] Event received:', JSON.stringify(event));

    try {
        const teamId = event.pathParameters?.teamId;

        if (!teamId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing teamId in path parameters' })
            };
        }

        const logs = await progressService.getProgressLogs(teamId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error('[ERROR] [getHistory] Error fetching progress history:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};
