const { logProgress, getProgressLogs } = require('../services/progressService');

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

/**
 * AWS Lambda Handler: POST /api/progress/update
 * Logs a progress update for a project (identified by teamId)
 */
exports.logUpdate = async (event) => {
    console.log(`[INFO] [logUpdate] Processing request`);

    try {
        let body;
        if (typeof event.body === 'string') {
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                console.error(`[ERROR] [logUpdate] JSON parse error: ${e.message}`);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: 'Invalid JSON body' })
                };
            }
        } else {
            body = event.body;
        }

        const { teamId, updateText, deltaPercentage } = body || {};

        if (!teamId || !updateText) {
            console.warn(`[WARN] [logUpdate] Missing required fields`);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing required fields: teamId, updateText' })
            };
        }

        if (deltaPercentage !== undefined) {
            const dp = Number(deltaPercentage);
            if (isNaN(dp) || dp < 0 || dp > 100) {
                console.warn(`[WARN] [logUpdate] Invalid deltaPercentage: ${deltaPercentage}`);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: 'deltaPercentage must be a number between 0 and 100' })
                };
            }
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);

        console.log(`[INFO] [logUpdate] Progress logged successfully for teamId: ${teamId}`);
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error(`[ERROR] [logUpdate] Internal error: ${error.message}`);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * AWS Lambda Handler: GET /api/progress/{teamId}
 * Fetches progress log history for a project (identified by teamId)
 */
exports.getHistory = async (event) => {
    const teamId = event.pathParameters?.teamId;
    console.log(`[INFO] [getHistory] Fetching history for teamId: ${teamId}`);

    try {
        if (!teamId) {
            console.warn(`[WARN] [getHistory] Missing teamId in path parameters`);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId is required' })
            };
        }

        const logs = await getProgressLogs(teamId);

        console.log(`[INFO] [getHistory] Successfully retrieved ${logs.length} logs for teamId: ${teamId}`);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error(`[ERROR] [getHistory] Internal error: ${error.message}`);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};
