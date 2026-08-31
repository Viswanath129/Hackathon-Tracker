const dynamoService = require('../services/dynamoService');

/**
 * Checks if a user has ownership or authorization for a given project/team ID.
 * Admins are granted full access.
 *
 * @param {Object} user - The user object from request or JWT context.
 * @param {string} projectId - The project or team identifier.
 * @returns {Promise<boolean>} True if authorized, false otherwise.
 */
async function checkProjectOwnership(user, projectId) {
    if (!user) {
        return false;
    }

    if (user.role === 'admin') {
        return true;
    }

    const userId = user._id || user.id;

    if (userId && userId === projectId) {
        return true;
    }

    if (user.email && user.email.toLowerCase() === projectId.toLowerCase()) {
        return true;
    }

    if (user.team_id && user.team_id === projectId) {
        return true;
    }

    try {
        const allProjects = await dynamoService.getAllProjects();
        const project = allProjects.find(
            (p) => p._id === projectId || p.SK === `PROJ#${projectId}` || p.PK === `PROJ#${projectId}`
        );

        if (project) {
            return (
                project.team_id === userId ||
                project.user_id === userId ||
                (project.email && user.email && project.email.toLowerCase() === user.email.toLowerCase())
            );
        }
    } catch (error) {
        console.error('Error verifying project ownership:', error);
    }

    return false;
}

module.exports = {
    checkProjectOwnership
};
