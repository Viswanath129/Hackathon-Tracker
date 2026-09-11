/**
 * Centralized project authorization utility to prevent Broken Object Level Authorization (BOLA).
 * Verifies if the authenticated user has permission to access or modify resources for a given project/team ID.
 */
const checkProjectOwnership = (user, projectId) => {
    if (!user) {
        return false;
    }

    // Admins bypass ownership checks and have access to all projects
    if (user.role === 'admin') {
        return true;
    }

    if (!projectId) {
        return false;
    }

    const targetId = String(projectId).trim();

    // Match strictly against user identifiers
    const userIdentifiers = [
        user._id,
        user.id,
        user.teamId,
        user.team_id,
        user.projectId,
        user.project_id,
        user.email
    ].filter(Boolean).map(id => String(id).trim());

    return userIdentifiers.some(id => id === targetId);
};

module.exports = {
    checkProjectOwnership
};
