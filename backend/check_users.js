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
            FilterExpression: "#t = :u",
            ExpressionAttributeNames: { "#t": "type" },
            ExpressionAttributeValues: { ":u": { S: "USER" } }
        }));
        console.log("Users found:", data.Items.length);
        data.Items.forEach(item => {
            console.log(`Email: ${item.email.S}, Role: ${item.role.S}, Team: ${item.team_name ? item.team_name.S : 'N/A'}`);
        });
    } catch (err) {
        console.error("Error:", err);
    }
}
run();
