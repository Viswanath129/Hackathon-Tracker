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
            FilterExpression: "attribute_not_exists(#t) OR #t <> :al",
            ExpressionAttributeNames: { "#t": "type" },
            ExpressionAttributeValues: { ":al": { S: "ACTIVITY_LOG" } }
        }));
        console.log("Non-Activity Items:", data.Items.length);
        if (data.Items.length > 0) console.log("Items:", data.Items);
    } catch (err) {
        console.error("Error:", err);
    }
}
run();
