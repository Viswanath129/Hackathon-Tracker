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
        const data = await client.send(new ScanCommand({ TableName: 'Projects', Limit: 5 }));
        console.log("Projects Table Items:", data.Items.length);
        if (data.Items.length > 0) console.log("First Project:", data.Items[0]);
    } catch (err) {
        console.error("Error:", err);
    }
}
run();
