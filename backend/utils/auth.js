const dynamoService = require('../services/dynamoService');

/**
 * Broken Object Level Authorization (BOLA) verification helper for project access.
 * Checks whether the project specified by teamId (projectId) belongs to user.
 *
 * @param {Object} user - Authenticated user object (must contain _id or role)
 * @param {string} projectId - Project ID (passed as teamId in request)
 * @returns {Promise<{ authorized: boolean, project: Object|null, statusCode?: number, message?: string }>}
 */
async function checkProjectOwnership(user, projectId) {
    if (!user) {
        return { authorized: false, project: null, statusCode: 401, message: 'User authentication required' };
    }

    const project = await dynamoService.getProjectById(projectId);
    if (!project) {
        return { authorized: false, project: null, statusCode: 404, message: 'Project not found' };
    }

    // Admins have access to all projects
    if (user.role === 'admin') {
        return { authorized: true, project };
    }

    // Non-admin user must match the team_id of the project
    if (String(project.team_id) !== String(user._id)) {
        return { authorized: false, project, statusCode: 403, message: 'Forbidden: You do not have permission to access this project' };
    }

    return { authorized: true, project };
}

module.exports = {
    checkProjectOwnership
};
