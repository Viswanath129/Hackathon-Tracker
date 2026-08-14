const { validateProgressInput } = require('../utils/validation');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { buildResponse, verifyToken, verifyProjectAccess } = require('./utils');

/**
 * Lambda handler for logging progress updates (POST /api/progress/update)
 */
const logUpdate = async (event) => {
    if (event && event.httpMethod === 'OPTIONS') {
        return buildResponse(200, {});
    }

    try {
        if (!event || !event.body) {
            return buildResponse(400, { message: 'Missing request body' });
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (err) {
            return buildResponse(400, { message: 'Invalid JSON payload' });
        }

        const { teamId, updateText, deltaPercentage } = body || {};
        console.log("Processing progress update for teamId:", teamId);

        const validation = validateProgressInput(body);
        if (!validation.isValid) {
            return buildResponse(400, { message: validation.error });
        }

        let authResult;
        try {
            authResult = await verifyToken(event);
        } catch (authError) {
            if (authError.statusCode === 401) {
                return buildResponse(401, { message: authError.message });
            }
            throw authError;
        }

        const { user } = authResult;
        const accessCheck = await verifyProjectAccess(user, teamId);

        if (!accessCheck.authorized) {
            if (accessCheck.reason === 'notFound') {
                return buildResponse(404, { message: 'Project not found' });
            }
            return buildResponse(403, { message: 'Forbidden: Access denied to project' });
        }

        const logResult = await logProgress(teamId, updateText, Number(deltaPercentage));
        return buildResponse(201, {
            message: 'Progress update logged successfully',
            data: logResult
        });
    } catch (error) {
        console.error("Internal server error in logUpdate:", error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * Lambda handler for retrieving progress logs (GET /api/progress/{teamId})
 */
const getHistory = async (event) => {
    if (event && event.httpMethod === 'OPTIONS') {
        return buildResponse(200, {});
    }

    try {
        const teamId = event && event.pathParameters ? event.pathParameters.teamId : null;
        console.log("Fetching progress history for teamId:", teamId);

        if (!teamId) {
            return buildResponse(400, { message: 'teamId path parameter is required' });
        }

        let authResult;
        try {
            authResult = await verifyToken(event);
        } catch (authError) {
            if (authError.statusCode === 401) {
                return buildResponse(401, { message: authError.message });
            }
            throw authError;
        }

        const { user } = authResult;
        const accessCheck = await verifyProjectAccess(user, teamId);

        if (!accessCheck.authorized) {
            if (accessCheck.reason === 'notFound') {
                return buildResponse(404, { message: 'Project not found' });
            }
            return buildResponse(403, { message: 'Forbidden: Access denied to project' });
        }

        const logs = await getProgressLogs(teamId);
        return buildResponse(200, logs);
    } catch (error) {
        console.error("Internal server error in getHistory:", error);
        return buildResponse(500, { message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
