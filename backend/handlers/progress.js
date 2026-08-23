const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');
const { buildResponse, authenticateEvent } = require('./utils');

const logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return buildResponse(200, { message: 'OK' });
    }

    try {
        const user = await authenticateEvent(event);
        if (!user) {
            return buildResponse(401, { message: 'Unauthorized' });
        }

        if (!event.body) {
            return buildResponse(400, { message: 'Missing request body' });
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseError) {
            return buildResponse(400, { message: 'Invalid JSON payload' });
        }

        const { teamId, updateText, deltaPercentage } = body || {};

        // Selective logging of teamId
        console.log(`[Lambda logUpdate] Processing progress update for teamId: ${teamId}`);

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return buildResponse(400, { message: validation.error });
        }

        const isAuthorized = await checkProjectOwnership(user, teamId);
        if (!isAuthorized) {
            return buildResponse(403, { message: 'Forbidden: Access denied to this project' });
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        return buildResponse(201, {
            message: 'Progress update logged successfully',
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error('[Lambda logUpdate] Error:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return buildResponse(200, { message: 'OK' });
    }

    try {
        const user = await authenticateEvent(event);
        if (!user) {
            return buildResponse(401, { message: 'Unauthorized' });
        }

        const teamId = event.pathParameters && (event.pathParameters.teamId || event.pathParameters.id);
        if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
            return buildResponse(400, { message: 'teamId parameter is required' });
        }

        // Selective logging of teamId
        console.log(`[Lambda getHistory] Fetching progress history for teamId: ${teamId}`);

        const isAuthorized = await checkProjectOwnership(user, teamId);
        if (!isAuthorized) {
            return buildResponse(403, { message: 'Forbidden: Access denied to this project' });
        }

        const logs = await getProgressLogs(teamId);
        return buildResponse(200, logs);
    } catch (error) {
        console.error('[Lambda getHistory] Error:', error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
