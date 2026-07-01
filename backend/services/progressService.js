const { PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLE_NAME } = require("../config/dynamo");

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
        this.statusCode = 400;
    }
}

/**
 * Validates progress update input
 */
const validateProgressInput = (teamId, updateText, deltaPercentage) => {
    if (typeof teamId !== "string" || !teamId.trim()) {
        throw new ValidationError("teamId must be a non-empty string");
    }
    if (typeof updateText !== "string" || !updateText.trim()) {
        throw new ValidationError("updateText must be a non-empty string");
    }
    const delta = Number(deltaPercentage);
    if (isNaN(delta) || delta < -100 || delta > 100) {
        throw new ValidationError("deltaPercentage must be a number between -100 and 100");
    }
    return {
        teamId: teamId.trim(),
        updateText: updateText.trim(),
        delta
    };
};

/**
 * Log a progress update for a project
 * PK: PROJ#<id>
 * SK: LOG#<timestamp>
 */
const logProgress = async (teamId, updateText, deltaPercentage) => {
    const sanitized = validateProgressInput(teamId, updateText, deltaPercentage);
    const timestamp = new Date().toISOString();

    const params = {
        TableName: TABLE_NAME,
        Item: {
            PK: `PROJ#${sanitized.teamId}`,
            SK: `LOG#${timestamp}`,
            update_text: sanitized.updateText,
            delta_percentage: sanitized.delta,
            timestamp: timestamp,
            type: "PROGRESS_LOG"
        }
    };

    try {
        await docClient.send(new PutCommand(params));
        return { success: true, timestamp };
    } catch (error) {
        console.error("[ERROR] [logProgress] DynamoDB Log Error:", error);
        throw error;
    }
};

const getProgressLogs = async (teamId) => {
    if (typeof teamId !== "string" || !teamId.trim()) {
        throw new ValidationError("teamId is required");
    }

    const params = {
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
            ":pk": `PROJ#${teamId.trim()}`,
            ":sk": "LOG#"
        }
    };

    try {
        const data = await docClient.send(new QueryCommand(params));
        return data.Items;
    } catch (error) {
        console.error("[ERROR] [getProgressLogs] DynamoDB Query Error:", error);
        throw error;
    }
};

module.exports = { logProgress, getProgressLogs, validateProgressInput, ValidationError };
