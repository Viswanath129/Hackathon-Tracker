const { logProgress, getProgressLogs } = require("../services/progressService");

/**
 * Handler for POST /api/progress/update
 * Expected body: { projectId, updateText, deltaPercentage }
 */
exports.logUpdate = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const { projectId, updateText, deltaPercentage } = body;

        if (!projectId || !updateText) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "projectId and updateText are required" })
            };
        }

        if (deltaPercentage !== undefined && (typeof deltaPercentage !== "number" || deltaPercentage < 0 || deltaPercentage > 100)) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "deltaPercentage must be a number between 0 and 100" })
            };
        }

        const result = await logProgress(projectId, updateText, deltaPercentage);

        return {
            statusCode: 201,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error("Error in logUpdate handler:", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ message: "Internal Server Error" })
        };
    }
};

/**
 * Handler for GET /api/progress/{teamId}
 * Note: teamId from path is used as projectId in DynamoDB schema
 */
exports.getHistory = async (event) => {
    try {
        const projectId = event.pathParameters.teamId;

        if (!projectId) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "projectId (teamId) is required" })
            };
        }

        const logs = await getProgressLogs(projectId);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify(logs)
        };
    } catch (error) {
        console.error("Error in getHistory handler:", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ message: "Internal Server Error" })
        };
    }
};
