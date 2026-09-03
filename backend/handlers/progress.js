const jwt = require("jsonwebtoken");
const { logProgress, getProgressLogs } = require("../services/progressService");
const { validateProgressInput } = require("../utils/validation");
const { checkProjectOwnership } = require("../utils/auth");

const getCorsHeaders = () => {
    const origin = process.env.CORS_ORIGIN || "http://localhost:5173";
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    };
};

/**
 * Extracts and verifies JWT from the event Authorization header.
 */
const verifyTokenFromEvent = (event) => {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
        return { user: null, error: "Authorization header missing" };
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === "") {
        return { user: null, error: "JWT secret is unconfigured" };
    }

    try {
        const decoded = jwt.verify(token, secret);
        return { user: decoded, error: null };
    } catch (err) {
        return { user: null, error: "Invalid token" };
    }
};

/**
 * Lambda Handler: logUpdate (POST /api/progress/update)
 */
exports.logUpdate = async (event) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    // Authenticate user first
    const { user, error: authError } = verifyTokenFromEvent(event);
    if (authError || !user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: authError || "Unauthorized" })
        };
    }

    if (!event.body) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: "Bad Request: Missing body" })
        };
    }

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (err) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: "Bad Request: Invalid JSON" })
        };
    }

    const { teamId, updateText, deltaPercentage } = body;

    // Validate input payload
    const validation = validateProgressInput({ teamId, updateText, deltaPercentage });
    if (!validation.isValid) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: validation.error })
        };
    }

    // Selective logging (avoiding full event or PII leak)
    console.log(`[logUpdate] Processing progress update for teamId: ${teamId}`);

    // Authorize (BOLA check)
    try {
        const authCheck = await checkProjectOwnership(user, teamId);
        if (!authCheck.authorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: authCheck.reason || "Forbidden" })
            };
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: "Progress update logged successfully",
                data: result
            })
        };
    } catch (err) {
        console.error(`[logUpdate Error] Error processing update for teamId ${teamId}:`, err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "Internal Server Error" })
        };
    }
};

/**
 * Lambda Handler: getHistory (GET /api/progress/{teamId})
 */
exports.getHistory = async (event) => {
    const headers = getCorsHeaders();

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    // Authenticate user first
    const { user, error: authError } = verifyTokenFromEvent(event);
    if (authError || !user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: authError || "Unauthorized" })
        };
    }

    const teamId = event.pathParameters?.teamId;
    if (!teamId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: "Bad Request: Missing teamId path parameter" })
        };
    }

    console.log(`[getHistory] Fetching history for teamId: ${teamId}`);

    // Authorize (BOLA check)
    try {
        const authCheck = await checkProjectOwnership(user, teamId);
        if (!authCheck.authorized) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: authCheck.reason || "Forbidden" })
            };
        }

        const logs = await getProgressLogs(teamId);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                teamId,
                logs: logs || []
            })
        };
    } catch (err) {
        console.error(`[getHistory Error] Error fetching history for teamId ${teamId}:`, err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "Internal Server Error" })
        };
    }
};
