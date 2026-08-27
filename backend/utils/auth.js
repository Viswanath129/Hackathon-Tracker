const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLE_NAME } = require('../config/dynamo');

/**
 * DynamoDB helper function to retrieve project by ID across partition keys using ScanCommand.
 * Uses ExpressionAttributeNames to map the reserved DynamoDB '#type' keyword.
 */
const getProjectById = async (projectId) => {
    try {
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
        const { Items } = await docClient.send(new ScanCommand(params));
        return Items && Items.length > 0 ? Items[0] : null;
    } catch (error) {
        console.error('getProjectById Error:', error);
        throw error;
    }
};

/**
 * Checks if the requesting user (or team) owns the specified project.
 * Admins bypass ownership check and are always authorized.
 *
 * @param {string} projectId - The project identifier
 * @param {Object} user - User object containing _id, email, role, etc.
 * @returns {Promise<boolean>} - True if authorized, false otherwise.
 */
const checkProjectOwnership = async (projectId, user) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    try {
        const project = await getProjectById(projectId);
        if (!project) return false;

        // Match team_id or owner identifier
        if (project.team_id && user._id && project.team_id === user._id) {
            return true;
        }
        if (project.user_id && user._id && project.user_id === user._id) {
            return true;
        }
        if (project.email && user.email && project.email.toLowerCase() === user.email.toLowerCase()) {
            return true;
        }

        return false;
    } catch (error) {
        console.error('checkProjectOwnership Error:', error);
        return false;
    }
};

module.exports = { checkProjectOwnership, getProjectById };
