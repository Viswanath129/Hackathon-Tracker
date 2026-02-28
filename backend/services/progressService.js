const { PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLE_NAME } = require("../config/dynamo");

/**
 * Log a progress update for a project
 * PK: PROJ#<id>
 * SK: LOG#<timestamp>
 */
const logProgress = async (projectId, updateText, deltaPercentage) => {
    const timestamp = new Date().toISOString();

    const params = {
        TableName: TABLE_NAME,
        Item: {
            PK: `PROJ#${projectId}`,
            SK: `LOG#${timestamp}`,
            update_text: updateText,
            delta_percentage: deltaPercentage,
            timestamp: timestamp,
            type: "PROGRESS_LOG"
        }
    };

    try {
        await docClient.send(new PutCommand(params));
        return { success: true, timestamp };
    } catch (error) {
        console.error("DynamoDB Log Error:", error);
        throw error;
    }
};

const getProgressLogs = async (projectId) => {
    const params = {
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
            ":pk": `PROJ#${projectId}`,
            ":sk": "LOG#"
        }
    };

    try {
        const data = await docClient.send(new QueryCommand(params));
        return data.Items;
    } catch (error) {
        console.error("DynamoDB Query Error:", error);
        throw error;
    }
};

module.exports = { logProgress, getProgressLogs };
