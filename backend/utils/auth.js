/**
 * Authorization helper to verify project ownership.
 * Performs strict equality checks against user identifiers to prevent BOLA vulnerabilities.
 */
function checkProjectOwnership(user, project) {
    if (!user || !project) {
        return false;
    }

    // Admins bypass ownership check
    if (user.role === 'admin') {
        return true;
    }

    const userId = user._id || user.id || user.teamId;
    const userEmail = user.email ? user.email.toLowerCase() : null;

    const projectTeamId = project.teamId || project._id;
    const projectEmail = project.email ? project.email.toLowerCase() : null;

    // Strict equality checks against user identifiers
    if (userId && projectTeamId && String(userId) === String(projectTeamId)) {
        return true;
    }

    if (userEmail && projectEmail && userEmail === projectEmail) {
        return true;
    }

    if (userEmail && project.PK && project.PK.toLowerCase() === `user#${userEmail}`) {
        return true;
    }

    if (userId && project.teamId && String(userId) === String(project.teamId)) {
        return true;
    }

    return false;
}

module.exports = {
    checkProjectOwnership
};
