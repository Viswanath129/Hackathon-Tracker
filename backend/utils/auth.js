/**
 * Checks if a user has ownership/access to a project.
 * Adheres to BOLA prevention by using strict equality checks across identifiers.
 */
function checkProjectOwnership(user, project) {
    if (!user || !project) {
        return false;
    }

    // Admins have access to all projects
    if (user.role === 'admin' || user.role === 'ADMIN') {
        return true;
    }

    const userIdStr = user._id ? String(user._id) : null;
    const userEmailStr = user.email ? String(user.email).toLowerCase() : null;
    const userTeamIdStr = user.teamId ? String(user.teamId) : null;

    const projectTeamIdStr = project.team_id ? String(project.team_id) : null;
    const projectUserEmailStr = project.email ? String(project.email).toLowerCase() : null;
    const projectPKStr = project.PK ? String(project.PK) : null;

    if (userIdStr && projectTeamIdStr && userIdStr === projectTeamIdStr) {
        return true;
    }

    if (userTeamIdStr && projectTeamIdStr && userTeamIdStr === projectTeamIdStr) {
        return true;
    }

    if (userEmailStr && projectUserEmailStr && userEmailStr === projectUserEmailStr) {
        return true;
    }

    if (userEmailStr && projectPKStr && projectPKStr.toLowerCase() === `user#${userEmailStr}`) {
        return true;
    }

    return false;
}

module.exports = {
    checkProjectOwnership
};
