const { docClient, TABLE_NAME } = require('../config/dynamo');
const { GetCommand, PutCommand, QueryCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

/**
 * DYNAMODB ONE-TABLE DESIGN SCHEMA
 * 
 * USER/TEAM: PK: USER#<email>, SK: METADATA
 * HACKATHON: PK: USER#<email>, SK: HACK#<id>
 * PROJECT:   PK: HACK#<id>, SK: PROJ#<id>
 * REPORT:    PK: PROJ#<id>, SK: ARTIFACT#<id>
 * ISSUE:     PK: USER#<email>, SK: ISSUE#<id>
 * PROGRESS:  PK: PROJ#<id>, SK: LOG#<timestamp>
 */

const dynamoService = {
    // ---------------------------------------------------------
    // USERS (Teams/Admins)
    // ---------------------------------------------------------
    getUser: async (email) => {
        const params = {
            TableName: TABLE_NAME,
            Key: {
                PK: `USER#${email.toLowerCase()}`,
                SK: 'METADATA'
            }
        };
        const { Item } = await docClient.send(new GetCommand(params));
        return Item;
    },

    saveUser: async (userData) => {
        const item = {
            PK: `USER#${userData.email.toLowerCase()}`,
            SK: 'METADATA',
            ...userData,
            _id: userData._id || `user_${Date.now()}`,
            type: 'USER',
            updatedAt: new Date().toISOString()
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return item;
    },

    getAllUsers: async () => {
        const { Items } = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
        return (Items || []).filter(i => i.type === 'USER');
    },

    deleteUser: async (email) => {
        await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: `USER#${email.toLowerCase()}`, SK: 'METADATA' }
        }));
    },

    // ---------------------------------------------------------
    // HACKATHONS
    // ---------------------------------------------------------
    getHackathon: async (email, hackId) => {
        const { Item } = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `USER#${email.toLowerCase()}`, SK: `HACK#${hackId}` }
        }));
        return Item;
    },

    getProjectById: async (projectId) => {
        let lastEvaluatedKey = undefined;
        do {
            const params = {
                TableName: TABLE_NAME,
                FilterExpression: "SK = :sk AND #type = :type",
                ExpressionAttributeNames: {
                    "#type": "type"
                },
                ExpressionAttributeValues: {
                    ":sk": `PROJ#${projectId}`,
                    ":type": "PROJECT"
                },
                ExclusiveStartKey: lastEvaluatedKey
            };
            const response = await docClient.send(new ScanCommand(params));
            if (response.Items && response.Items.length > 0) {
                return response.Items[0];
            }
            lastEvaluatedKey = response.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        return null;
    },

    getHackathonsByUser: async (email) => {
        const { Items } = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: { ":pk": `USER#${email.toLowerCase()}`, ":sk": "HACK#" }
        }));
        return Items;
    },

    getAllHackathons: async () => {
        const { Items } = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
        return (Items || []).filter(i => i.type === 'HACKATHON');
    },

    saveHackathon: async (email, hackathonData) => {
        const hackId = hackathonData._id || `hack_${Date.now()}`;
        const item = {
            PK: `USER#${email.toLowerCase()}`,
            SK: `HACK#${hackId}`,
            ...hackathonData,
            _id: hackId,
            type: 'HACKATHON',
            updatedAt: new Date().toISOString()
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return item;
    },

    deleteHackathon: async (email, hackId) => {
        await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: `USER#${email.toLowerCase()}`, SK: `HACK#${hackId}` }
        }));
    },

    // ---------------------------------------------------------
    // PROJECTS
    // ---------------------------------------------------------
    getProject: async (hackId, projId) => {
        const { Item } = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `HACK#${hackId}`, SK: `PROJ#${projId}` }
        }));
        return Item;
    },

    getProjectsByHackathon: async (hackathonId) => {
        const { Items } = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: { ":pk": `HACK#${hackathonId}`, ":sk": "PROJ#" }
        }));
        return Items;
    },

    getAllProjects: async () => {
        const { Items } = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
        return (Items || []).filter(i => i.type === 'PROJECT');
    },

    saveProject: async (hackathonId, projectData) => {
        const projId = projectData._id || `proj_${Date.now()}`;
        const item = {
            PK: `HACK#${hackathonId}`,
            SK: `PROJ#${projId}`,
            ...projectData,
            _id: projId,
            type: 'PROJECT',
            updatedAt: new Date().toISOString()
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return item;
    },

    deleteProject: async (hackId, projId) => {
        await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: `HACK#${hackId}`, SK: `PROJ#${projId}` }
        }));
    },

    // ---------------------------------------------------------
    // REPORTS (ARTIFACTS)
    // ---------------------------------------------------------
    getReportsByProject: async (projectId) => {
        const { Items } = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: { ":pk": `PROJ#${projectId}`, ":sk": "ARTIFACT#" }
        }));
        return Items;
    },

    saveReport: async (projectId, reportData) => {
        const artId = reportData._id || `art_${Date.now()}`;
        const item = {
            PK: `PROJ#${projectId}`,
            SK: `ARTIFACT#${artId}`,
            ...reportData,
            _id: artId,
            type: 'REPORT',
            updatedAt: new Date().toISOString()
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return item;
    },

    deleteReport: async (projectId, artId) => {
        await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: `PROJ#${projectId}`, SK: `ARTIFACT#${artId}` }
        }));
    },

    // ---------------------------------------------------------
    // ISSUES
    // ---------------------------------------------------------
    getIssuesByUser: async (email) => {
        const { Items } = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: { ":pk": `USER#${email.toLowerCase()}`, ":sk": "ISSUE#" }
        }));
        return Items;
    },

    saveIssue: async (email, issueData) => {
        const issueId = issueData._id || `issue_${Date.now()}`;
        const item = {
            PK: `USER#${email.toLowerCase()}`,
            SK: `ISSUE#${issueId}`,
            ...issueData,
            _id: issueId,
            type: 'ISSUE',
            updatedAt: new Date().toISOString()
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return item;
    },

    // ---------------------------------------------------------
    // ACTIVITY LOGS (Global & per-Team)
    // ---------------------------------------------------------
    saveActivity: async (activity) => {
        const timestamp = new Date().toISOString();
        const activityId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        // Save as Global Activity for Admin
        const globalItem = {
            PK: 'GLOBAL#ACTIVITY',
            SK: `ACTIVITY#${timestamp}#${activityId}`,
            ...activity,
            _id: activityId,
            type: 'ACTIVITY_LOG',
            timestamp
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: globalItem }));

        // Also save under the user/team for their local dashboard
        if (activity.email) {
            const teamItem = {
                PK: `USER#${activity.email.toLowerCase()}`,
                SK: `ACTIVITY#${timestamp}#${activityId}`,
                ...activity,
                _id: activityId,
                type: 'ACTIVITY_LOG',
                timestamp
            };
            await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: teamItem }));
        }
    },

    getGlobalActivity: async (limit = 20) => {
        const { Items } = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: { ":pk": "GLOBAL#ACTIVITY", ":sk": "ACTIVITY#" },
            ScanIndexForward: false, // Recent first
            Limit: limit
        }));
        return Items;
    },

    getActivitiesByUser: async (email, limit = 10) => {
        const { Items } = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: { ":pk": `USER#${email.toLowerCase()}`, ":sk": "ACTIVITY#" },
            ScanIndexForward: false, // Recent first
            Limit: limit
        }));
        return Items;
    }
};

module.exports = dynamoService;
