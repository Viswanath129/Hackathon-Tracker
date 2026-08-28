const dynamoService = require('../services/dynamoService');

/**
 * Checks if a user (or admin) has ownership/authorization over a given project/team.
 * Returns true if user is admin or if project's team_id matches user's _id.
 */
const checkProjectOwnership = async (user, projectId) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    const project = await dynamoService.getProjectById(projectId);
    if (!project) return false;

    return project.team_id === user._id;
};

module.exports = { checkProjectOwnership };
