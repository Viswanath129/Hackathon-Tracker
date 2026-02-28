const { DynamoDBClient, DescribeTableCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
require('dotenv').config();

const client = new DynamoDBClient({
    region: process.env.AWS_S3_REGION || "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const tables = ['HackathonTracker', 'Hackathons', 'Issues', 'ProgressLogs', 'Projects', 'Reports'];

async function run() {
    for (const table of tables) {
        try {
            const data = await client.send(new ScanCommand({ TableName: table, Select: "COUNT" }));
            console.log(`Table: ${table}, Count: ${data.Count}`);
        } catch (err) {
            console.error(`Error for ${table}:`, err.message);
        }
    }
}
run();
