/**
 * Utility function to verify project ownership for authorization checks.
 * Uses strict equality checks to prevent Broken Object Level Authorization (BOLA) vulnerabilities.
 */
function checkProjectOwnership(user, project) {
    if (!user || !project) {
        return false;
    }

    if (user.role === 'admin') {
        return true;
    }

    if (user._id && project.team_id && user._id === project.team_id) {
        return true;
    }

    if (user.teamId && project.team_id && user.teamId === project.team_id) {
        return true;
    }

    if (user.email && project.email && user.email === project.email) {
        return true;
    }

    if (user.email && project.user_email && user.email === project.user_email) {
        return true;
    }

    return false;
}

module.exports = { checkProjectOwnership };
