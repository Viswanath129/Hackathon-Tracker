const { logProgress, getProgressLogs } = require('../services/progressService');

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    const handlerName = 'logUpdate';
    console.log(`[INFO] [${handlerName}] Request received`);

    try {
        let body;
        if (typeof event.body === 'string') {
            try {
                body = JSON.parse(event.body);
            } catch (err) {
                console.error(`[ERROR] [${handlerName}] Malformed JSON:`, err);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: 'Invalid JSON format' })
                };
            }
        } else {
            body = event.body || {};
        }

        const { teamId, updateText, deltaPercentage } = body;

        // Validation
        if (!teamId || !updateText) {
            console.warn(`[WARN] [${handlerName}] Missing required fields`);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId and updateText are required' })
            };
        }

        if (deltaPercentage !== undefined) {
            const delta = parseFloat(deltaPercentage);
            if (isNaN(delta) || delta < 0 || delta > 100) {
                console.warn(`[WARN] [${handlerName}] Invalid deltaPercentage: ${deltaPercentage}`);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: 'deltaPercentage must be a number between 0 and 100' })
                };
            }
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        console.log(`[INFO] [${handlerName}] Progress logged successfully for team: ${teamId}`);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error(`[ERROR] [${handlerName}] Internal Server Error:`, error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    const handlerName = 'getHistory';
    console.log(`[INFO] [${handlerName}] Request received`);

    try {
        const teamId = event.pathParameters?.teamId;

        if (!teamId) {
            console.warn(`[WARN] [${handlerName}] Missing teamId in path parameters`);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'teamId is required' })
            };
        }

        const logs = await getProgressLogs(teamId);
        console.log(`[INFO] [${handlerName}] Retrieved ${logs.length} logs for team: ${teamId}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error(`[ERROR] [${handlerName}] Internal Server Error:`, error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};
