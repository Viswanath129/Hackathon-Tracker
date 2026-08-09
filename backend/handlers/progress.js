const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { formatResponse } = require('./utils');

/**
 * Shared helper to verify JWT from Lambda event headers
 */
const verifyAuth = async (event, handlerName) => {
    const authHeader = event.headers && (event.headers.authorization || event.headers.Authorization);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`[WARN] [${handlerName}] Missing or malformed authorization header`);
        throw { statusCode: 401, body: { message: 'Not authorized, no token' } };
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === '') {
        console.error(`[ERROR] [${handlerName}] JWT_SECRET environment variable is unconfigured`);
        throw { statusCode: 500, body: { message: 'Internal Server Error' }, isSecureConfigError: true };
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
        decoded = jwt.verify(token, secret);
    } catch (err) {
        console.error(`[ERROR] [${handlerName}] JWT validation failed:`, err.message);
        throw { statusCode: 401, body: { message: 'Not authorized, token failed' } };
    }

    let user = await dynamoService.getUser(decoded.email);
    if (!user) {
        const allUsers = await dynamoService.getAllUsers();
        user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
    }

    if (!user) {
        console.warn(`[WARN] [${handlerName}] User ${decoded.email} not found in database`);
        throw { statusCode: 401, body: { message: 'User not found in cloud' } };
    }

    return user;
};

/**
 * Shared helper to enforce Broken Object Level Authorization (BOLA)
 */
const verifyBOLA = async (user, teamId, handlerName) => {
    const project = await dynamoService.getProjectById(teamId);
    if (!project) {
        console.warn(`[WARN] [${handlerName}] Project with ID ${teamId} not found`);
        throw { statusCode: 404, body: { message: 'Project not found' } };
    }

    if (user.role !== 'admin' && project.team_id !== user._id) {
        console.warn(`[WARN] [${handlerName}] BOLA violation: user ${user._id} role ${user.role} attempted to access project owned by ${project.team_id}`);
        throw { statusCode: 403, body: { message: 'Forbidden: Access denied to this project' } };
    }

    return project;
};

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    const handlerName = 'logUpdate';
    console.log(`[INFO] [${handlerName}] Received progress update request`);

    // Handle OPTIONS Preflight request
    if (event.httpMethod === 'OPTIONS') {
        return formatResponse(200, {});
    }

    if (!event.body) {
        console.warn(`[WARN] [${handlerName}] Request body is missing`);
        return formatResponse(400, { message: 'Request body is missing' });
    }

    let body;
    try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (err) {
        console.error(`[ERROR] [${handlerName}] JSON parsing failed:`, err.message);
        return formatResponse(400, { message: 'Invalid JSON format' });
    }

    // Selective logging of identifiers like teamId after parsing the request body (avoid printing full event)
    if (body && body.teamId) {
        console.log(`[INFO] [${handlerName}] Selective Logging - parsed teamId: ${body.teamId}`);
    }

    const validation = validateProgressInput(body);
    if (!validation.isValid) {
        console.warn(`[WARN] [${handlerName}] Validation failed: ${validation.message}`);
        return formatResponse(400, { message: validation.message });
    }

    try {
        const user = await verifyAuth(event, handlerName);
        await verifyBOLA(user, body.teamId, handlerName);

        const result = await logProgress(body.teamId, body.updateText, Number(body.deltaPercentage));
        console.log(`[INFO] [${handlerName}] Successfully logged progress update for teamId: ${body.teamId}`);

        return formatResponse(201, {
            message: 'Progress update logged successfully',
            timestamp: result.timestamp
        });
    } catch (err) {
        if (err.statusCode) {
            if (err.isSecureConfigError || err.statusCode === 500) {
                // Securely return generic message
                return formatResponse(500, { message: 'Internal Server Error' });
            }
            return formatResponse(err.statusCode, err.body);
        }
        console.error(`[ERROR] [${handlerName}] Unexpected error encountered:`, err);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};

/**
 * GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    const handlerName = 'getHistory';
    console.log(`[INFO] [${handlerName}] Received progress history request`);

    // Handle OPTIONS Preflight request
    if (event.httpMethod === 'OPTIONS') {
        return formatResponse(200, {});
    }

    const teamId = event.pathParameters && event.pathParameters.teamId;
    if (!teamId || teamId.trim() === '') {
        console.warn(`[WARN] [${handlerName}] teamId parameter is missing or empty`);
        return formatResponse(400, { message: 'teamId is required' });
    }

    console.log(`[INFO] [${handlerName}] Selective Logging - querying history for teamId: ${teamId}`);

    try {
        const user = await verifyAuth(event, handlerName);
        await verifyBOLA(user, teamId, handlerName);

        const logs = await getProgressLogs(teamId);
        console.log(`[INFO] [${handlerName}] Successfully retrieved ${logs.length} logs for teamId: ${teamId}`);

        return formatResponse(200, logs);
    } catch (err) {
        if (err.statusCode) {
            if (err.isSecureConfigError || err.statusCode === 500) {
                // Securely return generic message
                return formatResponse(500, { message: 'Internal Server Error' });
            }
            return formatResponse(err.statusCode, err.body);
        }
        console.error(`[ERROR] [${handlerName}] Unexpected error encountered:`, err);
        return formatResponse(500, { message: 'Internal Server Error' });
    }
};
