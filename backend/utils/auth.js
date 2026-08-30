const { docClient, TABLE_NAME } = require('../config/dynamo');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');

/**
 * Verifies whether a project belongs to a user/team or if user is an admin.
 * Uses ScanCommand with ExpressionAttributeNames mapping for reserved keywords like #type.
 */
async function getProjectById(projectId) {
    const params = {
        TableName: TABLE_NAME,
        FilterExpression: 'SK = :sk AND #type = :type',
        ExpressionAttributeNames: {
            '#type': 'type'
        },
        ExpressionAttributeValues: {
            ':sk': `PROJ#${projectId}`,
            ':type': 'PROJECT'
        }
    };

    try {
        const data = await docClient.send(new ScanCommand(params));
        if (data.Items && data.Items.length > 0) {
            return data.Items[0];
        }
        return null;
    } catch (error) {
        console.error('Error in getProjectById:', error);
        throw error;
    }
}

async function checkProjectOwnership(projectId, user) {
    if (!user) {
        return false;
    }

    if (user.role === 'admin') {
        return true;
    }

    const project = await getProjectById(projectId);
    if (!project) {
        return false;
    }

    // Check if team_id matches user._id or user.id
    const userId = user._id || user.id;
    return project.team_id === userId;
}

module.exports = { checkProjectOwnership, getProjectById };
