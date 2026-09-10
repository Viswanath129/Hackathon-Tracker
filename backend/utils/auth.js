const dynamoService = require('../services/dynamoService');

/**
 * Broken Object Level Authorization (BOLA) Verification
 * Checks if the user has permission to access or log updates for a given project.
 */
const checkProjectOwnership = async (user, projectId) => {
    if (!user || !projectId) return false;
    if (user.role === 'admin') return true;

    const project = await dynamoService.getProjectById(projectId);
    if (!project) return false;

    if (project.team_id && (project.team_id === user._id || project.team_id === user.id)) {
        return true;
    }
    if (project.userEmail && user.email && project.userEmail.toLowerCase() === user.email.toLowerCase()) {
        return true;
    }
    if (project.email && user.email && project.email.toLowerCase() === user.email.toLowerCase()) {
        return true;
    }
    if (user._id && project.user_id && user._id === project.user_id) {
        return true;
    }

    return false;
};

module.exports = { checkProjectOwnership };
