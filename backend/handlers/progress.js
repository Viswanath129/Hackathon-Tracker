const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { formatResponse } = require('./utils');

const logUpdate = async (event) => {
    try {
        console.log(`[INFO] [logUpdate] Starting progress log update handler.`);

        if (!event || !event.body) {
            console.log(`[WARN] [logUpdate] Request body is missing.`);
            return formatResponse(400, { message: "Request body is missing" });
        }

        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (err) {
            console.log(`[WARN] [logUpdate] JSON parsing failed: ${err.message}`);
            return formatResponse(400, { message: "Invalid JSON format" });
        }

        const { valid, message } = validateProgressInput(body);
        if (!valid) {
            console.log(`[WARN] [logUpdate] Validation failed: ${message}`);
            return formatResponse(400, { message });
        }

        const { teamId, updateText, deltaPercentage } = body;
        console.log(`[INFO] [logUpdate] Parsed log update request for teamId: ${teamId}`);

        const email = event.requestContext?.authorizer?.claims?.email || event.requestContext?.authorizer?.claims?.username;
        if (!email) {
            console.log(`[WARN] [logUpdate] Unauthorized: Missing user email in Cognito authorizer context.`);
            return formatResponse(401, { message: "Unauthorized: Missing user identity" });
        }

        let user = await dynamoService.getUser(email);
        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === email));
        }

        if (!user) {
            console.log(`[WARN] [logUpdate] Unauthorized: User ${email} not found in database.`);
            return formatResponse(401, { message: "Unauthorized: User not found in database" });
        }

        const projects = await dynamoService.getAllProjects();
        const project = projects.find(p => p._id === teamId);

        if (!project) {
            console.log(`[WARN] [logUpdate] Project with teamId/projectId ${teamId} not found.`);
            return formatResponse(404, { message: "Project not found" });
        }

        // BOLA check
        if (user.role !== 'admin' && project.team_id !== user._id) {
            console.log(`[WARN] [logUpdate] Forbidden: User ${user.email} is not authorized to update project ${teamId}.`);
            return formatResponse(403, { message: "Forbidden: You do not own this project" });
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        console.log(`[INFO] [logUpdate] Successfully logged progress update for teamId: ${teamId}`);

        return formatResponse(201, { success: true, timestamp: result.timestamp });
    } catch (error) {
        console.error(`[ERROR] [logUpdate] Detailed internal error:`, error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

const getHistory = async (event) => {
    try {
        console.log(`[INFO] [getHistory] Starting progress get history handler.`);

        const teamId = event?.pathParameters?.teamId;
        if (!teamId || teamId.trim() === '') {
            console.log(`[WARN] [getHistory] teamId parameter is missing.`);
            return formatResponse(400, { message: "teamId parameter is required" });
        }

        console.log(`[INFO] [getHistory] Processing request for teamId: ${teamId}`);

        const email = event.requestContext?.authorizer?.claims?.email || event.requestContext?.authorizer?.claims?.username;
        if (!email) {
            console.log(`[WARN] [getHistory] Unauthorized: Missing user email in Cognito authorizer context.`);
            return formatResponse(401, { message: "Unauthorized: Missing user identity" });
        }

        let user = await dynamoService.getUser(email);
        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === email));
        }

        if (!user) {
            console.log(`[WARN] [getHistory] Unauthorized: User ${email} not found.`);
            return formatResponse(401, { message: "Unauthorized: User not found in database" });
        }

        const projects = await dynamoService.getAllProjects();
        const project = projects.find(p => p._id === teamId);

        if (!project) {
            console.log(`[WARN] [getHistory] Project with teamId/projectId ${teamId} not found.`);
            return formatResponse(404, { message: "Project not found" });
        }

        // BOLA check
        if (user.role !== 'admin' && project.team_id !== user._id) {
            console.log(`[WARN] [getHistory] Forbidden: User ${user.email} is not authorized to view history for project ${teamId}.`);
            return formatResponse(403, { message: "Forbidden: You do not own this project" });
        }

        const logs = await getProgressLogs(teamId);
        console.log(`[INFO] [getHistory] Successfully retrieved progress history for teamId: ${teamId}`);

        return formatResponse(200, logs || []);
    } catch (error) {
        console.error(`[ERROR] [getHistory] Detailed internal error:`, error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = {
    logUpdate,
    getHistory
};
