const dynamoService = require('../services/dynamoService');

/**
 * Verifies project/team ownership to prevent Broken Object Level Authorization (BOLA).
 * Admins are permitted to access any project.
 * Non-admin users are checked to ensure the project belongs to them or their team.
 *
 * @param {string} projectId - The target teamId / projectId
 * @param {Object} user - The authenticated user object from request/token
 * @returns {Promise<boolean>} True if authorized, false otherwise.
 */
async function checkProjectOwnership(projectId, user) {
    if (!user) return false;
    if (user.role === 'admin') return true;

    try {
        const project = await dynamoService.getProjectById(projectId);
        if (!project) return false;

        // Check if user email or loginEmail matches project owner or team
        const userEmail = (user.email || user.loginEmail || '').toLowerCase();

        if (project.userEmail && project.userEmail.toLowerCase() === userEmail) {
            return true;
        }

        if (project.PK && project.PK.toLowerCase() === `user#${userEmail}`) {
            return true;
        }

        // Check if user is part of team members
        if (project.members && Array.isArray(project.members)) {
            const isMember = project.members.some(m =>
                (typeof m === 'string' ? m.toLowerCase() : m.email && m.email.toLowerCase()) === userEmail
            );
            if (isMember) return true;
        }

        return false;
    } catch (error) {
        console.error('Error in checkProjectOwnership:', error);
        return false;
    }
}

module.exports = { checkProjectOwnership };
