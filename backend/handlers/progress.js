const jwt = require("jsonwebtoken");
const { logProgress, getProgressLogs, getProjectById } = require("../services/progressService");
const dynamoService = require("../services/dynamoService");
const { validateProgressInput } = require("../utils/validation");
const { checkProjectOwnership } = require("../utils/auth");

const corsHeaders = {
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "http://localhost:5173",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

/**
 * Authenticate request user from Authorization header or API Gateway authorizer context
 */
async function getAuthUser(event) {
    if (event.requestContext && event.requestContext.authorizer) {
        const claims = event.requestContext.authorizer.claims || event.requestContext.authorizer;
        if (claims && claims.email) {
            let user = await dynamoService.getUser(claims.email);
            if (!user) {
                const allUsers = await dynamoService.getAllUsers();
                user = allUsers.find(t => t.members && t.members.some(m => m.email === claims.email));
            }
            if (user) {
                return { ...user, loginEmail: claims.email };
            }
        }
    }

    const authHeader = event.headers && (event.headers.Authorization || event.headers.authorization);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.split(" ")[1];
    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not configured");
        return null;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user = await dynamoService.getUser(decoded.email);
        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
        }
        if (!user) {
            return null;
        }
        return { ...user, loginEmail: decoded.email };
    } catch (err) {
        console.error("Token verification failed:", err.message);
        return null;
    }
}

/**
 * Lambda handler for POST /api/progress/update
 */
exports.logUpdate = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers: corsHeaders, body: "" };
    }

    if (!event.body) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Bad Request: Missing request body" })
        };
    }

    let parsedBody;
    try {
        parsedBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (err) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Bad Request: Invalid JSON body" })
        };
    }

    const validation = validateProgressInput(parsedBody);
    if (!validation.isValid) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: validation.error })
        };
    }

    const { teamId, updateText, deltaPercentage } = parsedBody;

    try {
        const user = await getAuthUser(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Unauthorized" })
            };
        }

        const project = await getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Project not found" })
            };
        }

        const isOwner = checkProjectOwnership(user, project);
        if (!isOwner) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Forbidden: You do not have permission to update this project" })
            };
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Progress logged successfully", data: result })
        };
    } catch (error) {
        console.error("Error logging progress in Lambda handler:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Internal Server Error" })
        };
    }
};

/**
 * Lambda handler for GET /api/progress/{teamId}
 */
exports.getHistory = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers: corsHeaders, body: "" };
    }

    const teamId = (event.pathParameters && (event.pathParameters.teamId || event.pathParameters.id)) ||
                   (event.queryStringParameters && event.queryStringParameters.teamId);

    if (!teamId) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Bad Request: Missing teamId parameter" })
        };
    }

    try {
        const user = await getAuthUser(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Unauthorized" })
            };
        }

        const project = await getProjectById(teamId);
        if (!project) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Project not found" })
            };
        }

        const isOwner = checkProjectOwnership(user, project);
        if (!isOwner) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Forbidden: You do not have permission to view progress for this project" })
            };
        }

        const logs = await getProgressLogs(teamId);
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ success: true, data: logs })
        };
    } catch (error) {
        console.error("Error retrieving progress history in Lambda handler:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Internal Server Error" })
        };
    }
};
