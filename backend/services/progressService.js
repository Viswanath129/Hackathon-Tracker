const { PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLE_NAME } = require("../config/dynamo");

/**
 * Log a progress update for a project in DynamoDB.
 * PK: PROJ#<projectId>
 * SK: LOG#<timestamp>
 *
 * @param {string} projectId - The unique identifier for the project.
 * @param {string} updateText - A text description of the progress update.
 * @param {number} deltaPercentage - The change in progress percentage (0-100).
 * @returns {Promise<{success: boolean, timestamp: string}>}
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

/**
 * Retrieve all progress logs for a specific project.
 *
 * @param {string} projectId - The unique identifier for the project.
 * @returns {Promise<Array<Object>>} - An array of progress log objects.
 */
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
        return data.Items || [];
    } catch (error) {
        console.error("DynamoDB Query Error:", error);
        throw error;
    }
};

module.exports = { logProgress, getProgressLogs };
