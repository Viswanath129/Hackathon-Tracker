const progressService = require('../services/progressService');

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
};

/**
 * Lambda handler to log a progress update
 * Expected body: { teamId: string, updateText: string, deltaPercentage: number }
 */
exports.logUpdate = async (event) => {
    console.log(`[INFO] [logUpdate] Received event: ${JSON.stringify(event)}`);

    try {
        let body;
        if (typeof event.body === 'string') {
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                console.error(`[ERROR] [logUpdate] Malformed JSON: ${e.message}`);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: 'Invalid JSON format' }),
                };
            }
        } else {
            body = event.body || {};
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Validation
        if (!teamId || !updateText) {
            console.warn(`[WARN] [logUpdate] Missing required fields: teamId=${teamId}, updateText=${updateText}`);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId and updateText are required' }),
            };
        }

        if (deltaPercentage !== undefined) {
            const numDelta = Number(deltaPercentage);
            if (isNaN(numDelta) || numDelta < 0 || numDelta > 100) {
                console.warn(`[WARN] [logUpdate] Invalid deltaPercentage: ${deltaPercentage}`);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: 'deltaPercentage must be a numeric value between 0 and 100' }),
                };
            }
        }

        // teamId maps to projectId in the service layer
        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);

        console.log(`[INFO] [logUpdate] Successfully logged progress for teamId: ${teamId}`);
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result),
        };

    } catch (error) {
        console.error(`[ERROR] [logUpdate] ${error.message}`, error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};

/**
 * Lambda handler to get progress history
 * Expected path parameter: teamId
 */
exports.getHistory = async (event) => {
    console.log(`[INFO] [getHistory] Received event: ${JSON.stringify(event)}`);

    try {
        const teamId = event.pathParameters?.teamId;

        if (!teamId) {
            console.warn('[WARN] [getHistory] Missing teamId in path parameters');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId is required' }),
            };
        }

        // teamId maps to projectId in the service layer
        const logs = await progressService.getProgressLogs(teamId);

        console.log(`[INFO] [getHistory] Successfully retrieved ${logs.length} logs for teamId: ${teamId}`);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs),
        };

    } catch (error) {
        console.error(`[ERROR] [getHistory] ${error.message}`, error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};
