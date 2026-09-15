const dynamoService = require('../services/dynamoService');

/**
 * Authorization helper to verify project ownership.
 * Performs strict equality checks on user identifiers (team_id, _id, email)
 * to prevent Broken Object Level Authorization (BOLA) vulnerabilities.
 */
async function checkProjectOwnership(user, projectId) {
    if (!user || !projectId) {
        return { authorized: false, notFound: false, message: 'Missing user or projectId' };
    }

    const project = await dynamoService.getProjectById(projectId);
    if (!project) {
        return { authorized: false, notFound: true, message: 'Project not found' };
    }

    if (user.role === 'admin') {
        return { authorized: true, project };
    }

    const userId = user._id ? String(user._id) : null;
    const userEmail = user.email ? String(user.email).toLowerCase() : null;

    const projectTeamId = project.team_id ? String(project.team_id) : null;
    const projectEmail = project.email ? String(project.email).toLowerCase() : null;
    const projectUserId = project.user_id ? String(project.user_id) : null;

    const isMatch =
        (userId && (projectTeamId === userId || projectUserId === userId)) ||
        (userEmail && projectEmail === userEmail);

    if (isMatch) {
        return { authorized: true, project };
    }

    return { authorized: false, notFound: false, message: 'Unauthorized access to project' };
}

module.exports = { checkProjectOwnership };
