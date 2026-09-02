const dynamoService = require('../services/dynamoService');

/**
 * Verifies if user (or admin) has access/ownership to the specified project/teamId.
 *
 * @param {Object} user - User payload from auth token/middleware.
 * @param {string} teamId - Target project ID or team ID to verify.
 * @returns {Promise<boolean>}
 */
async function checkProjectOwnership(user, teamId) {
    if (!user || !teamId) return false;

    // Admin users bypass team ownership restrictions
    if (user.role === 'admin') return true;

    // Direct user/team ID match
    if (user._id === teamId || user.id === teamId) return true;

    // Look up project in DynamoDB to check team_id matching user._id or user.id
    try {
        const project = await dynamoService.getProjectById(teamId);
        if (project && (project.team_id === user._id || project.team_id === user.id)) {
            return true;
        }
    } catch (err) {
        console.error('Error in checkProjectOwnership:', err);
    }

    return false;
}

module.exports = { checkProjectOwnership };
