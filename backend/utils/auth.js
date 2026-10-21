/**
 * Centralized authorization helper functions.
 */

/**
 * Verifies if user has ownership or access rights to a project/team.
 * Admins are allowed access across all projects.
 * Otherwise, project's team_id or owner email must strictly match user's _id, email, or teamId.
 */
function checkProjectOwnership(user, project) {
    if (!user || !project) return false;

    if (user.role === 'admin') return true;

    const userId = user._id || user.id || user.teamId;
    const projectTeamId = project.team_id || project.teamId;

    if (projectTeamId && userId && String(projectTeamId) === String(userId)) {
        return true;
    }

    if (project.email && user.email && project.email.toLowerCase() === user.email.toLowerCase()) {
        return true;
    }

    return false;
}

module.exports = {
    checkProjectOwnership
};
