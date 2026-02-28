const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
require('dotenv').config();

const client = new DynamoDBClient({
    region: process.env.AWS_S3_REGION || "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

async function run() {
    try {
        const data = await client.send(new ScanCommand({
            TableName: 'HackathonTracker',
            FilterExpression: "#t = :p",
            ExpressionAttributeNames: { "#t": "type" },
            ExpressionAttributeValues: { ":p": { S: "PROJECT" } }
        }));
        console.log("Projects found:", data.Items.length);
        data.Items.forEach(item => {
            console.log(`Title: ${item.project_title ? item.project_title.S : 'N/A'}, PK: ${item.PK.S}, SK: ${item.SK.S}`);
        });
    } catch (err) {
        console.error("Error:", err);
    }
}
run();
