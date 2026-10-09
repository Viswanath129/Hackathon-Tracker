const jwt = require("jsonwebtoken");
const { logProgress, getProgressLogs } = require("../services/progressService");
const { validateProgressInput } = require("../utils/validation");

const corsHeaders = {
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "http://localhost:5173",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

/**
 * Lambda handler for logging progress updates.
 * POST /api/progress/update
 */
const logUpdate = async (event) => {
    try {
        if (!event || !event.body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Missing request body" })
            };
        }

        let body;
        try {
            body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        } catch (err) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Invalid JSON in request body" })
            };
        }

        const validation = validateProgressInput(body);
        if (!validation.valid) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: validation.message })
            };
        }

        const { teamId, updateText, deltaPercentage } = body;
        const result = await logProgress(teamId, updateText, deltaPercentage);

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: "Progress update logged successfully",
                data: result
            })
        };
    } catch (error) {
        console.error("Error in logUpdate handler:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Internal Server Error" })
        };
    }
};

/**
 * Lambda handler for retrieving progress update history.
 * GET /api/progress/{teamId}
 */
const getHistory = async (event) => {
    try {
        const authHeader = event?.headers?.Authorization || event?.headers?.authorization;
        if (!authHeader) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Authorization token required" })
            };
        }

        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!process.env.JWT_SECRET) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Internal Server Error" })
            };
        }

        try {
            jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Invalid or expired token" })
            };
        }

        const teamId = event?.pathParameters?.teamId;
        if (!teamId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ message: "teamId path parameter is required" })
            };
        }

        const logs = await getProgressLogs(teamId);
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                teamId,
                logs: logs || []
            })
        };
    } catch (error) {
        console.error("Error in getHistory handler:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Internal Server Error" })
        };
    }
};

module.exports = { logUpdate, getHistory };
