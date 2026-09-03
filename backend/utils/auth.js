const dynamoService = require('../services/dynamoService');

/**
 * Checks if a user is authorized to access/modify a specific project.
 * Adheres to Broken Object Level Authorization (BOLA) verification requirements.
 *
 * Admins are granted access automatically.
 * Non-admins are verified to ensure their user email matches the team email on the project record,
 * or user._id matches project.teamId / project.team.
 *
 * @param {Object} user - Authenticated user object ({ role, email, _id })
 * @param {string} projectId - Project identifier (teamId in routes/handlers)
 * @returns {Promise<{ authorized: boolean, project: Object|null, reason?: string }>}
 */
async function checkProjectOwnership(user, projectId) {
    if (!user) {
        return { authorized: false, project: null, reason: 'User not authenticated' };
    }

    if (user.role === 'admin') {
        return { authorized: true, project: null };
    }

    const project = await dynamoService.getProjectById(projectId);
    if (!project) {
        return { authorized: false, project: null, reason: 'Project not found' };
    }

    // Check ownership by comparing email or team ID
    const userEmail = (user.email || '').toLowerCase();
    const projectEmail = (project.teamEmail || project.userEmail || project.email || '').toLowerCase();
    const projectTeamId = project.teamId || project.team || project.userId;

    const isOwner = (userEmail && projectEmail && userEmail === projectEmail) ||
                    (user._id && projectTeamId && String(user._id) === String(projectTeamId));

    if (!isOwner) {
        return { authorized: false, project, reason: 'Forbidden: You do not own this project' };
    }

    return { authorized: true, project };
}

module.exports = {
    checkProjectOwnership
};
