const progressService = require("../services/progressService");
const { formatResponse, logger } = require("./utils");

/**
 * POST /api/progress/update
 * Body: { teamId, updateText, deltaPercentage }
 */
const logUpdate = async (event) => {
    const handlerName = "logUpdate";
    try {
        let body;
        if (typeof event.body === "string") {
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                logger.error(handlerName, "Invalid JSON in request body", e);
                return formatResponse(400, { message: "Invalid JSON in request body" });
            }
        } else {
            body = event.body || {};
        }

        const { teamId, updateText, deltaPercentage } = body;

        if (!teamId || !updateText || deltaPercentage === undefined) {
            return formatResponse(400, { message: "Missing required fields: teamId, updateText, deltaPercentage" });
        }

        const parsedDelta = parseFloat(deltaPercentage);
        if (isNaN(parsedDelta) || parsedDelta < 0 || parsedDelta > 100) {
            return formatResponse(400, { message: "deltaPercentage must be a number between 0 and 100" });
        }

        logger.info(handlerName, `Logging progress for team: ${teamId}`);
        const result = await progressService.logProgress(teamId, updateText, parsedDelta);

        return formatResponse(201, result);
    } catch (error) {
        logger.error(handlerName, "Error logging progress", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

/**
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    const handlerName = "getHistory";
    try {
        const teamId = event.pathParameters?.teamId;

        if (!teamId) {
            return formatResponse(400, { message: "teamId path parameter is required" });
        }

        logger.info(handlerName, `Fetching progress history for team: ${teamId}`);
        const logs = await progressService.getProgressLogs(teamId);

        return formatResponse(200, logs);
    } catch (error) {
        logger.error(handlerName, "Error fetching progress history", error);
        return formatResponse(500, { message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
