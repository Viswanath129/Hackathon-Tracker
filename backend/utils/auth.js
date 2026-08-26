const dynamoService = require('../services/dynamoService');

/**
 * Centralized authorization helper for BOLA verification.
 * Checks if a user has ownership over the given project (teamId) or has admin privileges.
 *
 * @param {Object|string} user - Requesting user object or user email.
 * @param {string} teamId - Project / Team ID.
 * @returns {Promise<boolean>} True if authorized, false otherwise.
 */
const checkProjectOwnership = async (user, teamId) => {
    if (!user || !teamId) return false;

    let userObj = typeof user === 'object' ? user : null;
    if (typeof user === 'string') {
        try {
            userObj = await dynamoService.getUser(user);
        } catch (err) {
            return false;
        }
    }

    if (!userObj) return false;

    // Admin users are authorized for all projects
    if (userObj.role === 'admin') {
        return true;
    }

    // Fetch the project using DynamoDB helper
    const project = await dynamoService.getProjectById(teamId);
    if (!project) {
        return false;
    }

    // Verify ownership by checking team_id or PK matching USER#email
    const userId = userObj._id || userObj.id;
    if (userId && project.team_id === userId) {
        return true;
    }

    if (userObj.email && (project.PK === `USER#${userObj.email.toLowerCase()}` || project.email === userObj.email)) {
        return true;
    }

    return false;
};

module.exports = { checkProjectOwnership };
