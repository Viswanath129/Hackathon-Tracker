const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');
const { createResponse, verifyToken } = require('./utils');

const logUpdate = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(200, { message: 'OK' });
    }

    try {
        if (!event.body) {
            return createResponse(400, { message: 'Missing JSON request body' });
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
            return createResponse(400, { message: 'Invalid JSON request body' });
        }

        if (!body || typeof body !== 'object') {
            return createResponse(400, { message: 'Request body must be a JSON object' });
        }

        const teamId = body.teamId;
        if (teamId) {
            console.log(`Processing logUpdate request for teamId: ${teamId}`);
        }

        const user = await verifyToken(event);
        if (!user) {
            return createResponse(401, { message: 'Not authorized, token failed' });
        }

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return createResponse(400, { message: validation.error });
        }

        const isAuthorized = await checkProjectOwnership(user, teamId);
        if (!isAuthorized) {
            return createResponse(403, { message: 'Forbidden: Access denied to this project' });
        }

        const result = await logProgress(teamId, body.updateText, Number(body.deltaPercentage));
        return createResponse(201, result);
    } catch (error) {
        console.error("Error in logUpdate handler:", error);
        return createResponse(500, { message: 'Internal Server Error' });
    }
};

const getHistory = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(200, { message: 'OK' });
    }

    try {
        const teamId = event.pathParameters?.teamId || event.pathParameters?.id;
        if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
            return createResponse(400, { message: 'teamId path parameter is required' });
        }

        console.log(`Processing getHistory request for teamId: ${teamId}`);

        const user = await verifyToken(event);
        if (!user) {
            return createResponse(401, { message: 'Not authorized, token failed' });
        }

        const isAuthorized = await checkProjectOwnership(user, teamId);
        if (!isAuthorized) {
            return createResponse(403, { message: 'Forbidden: Access denied to this project' });
        }

        const logs = await getProgressLogs(teamId);
        return createResponse(200, logs);
    } catch (error) {
        console.error("Error in getHistory handler:", error);
        return createResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
