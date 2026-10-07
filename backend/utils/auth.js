/**
 * Checks if the request user owns the specified project.
 * Uses strict equality comparison on user identifiers (_id, teamId, email, user_id)
 * to prevent BOLA (Broken Object Level Authorization) vulnerabilities.
 */
function checkProjectOwnership(user, project) {
    if (!user || !project) {
        return false;
    }

    // Admin role bypasses project ownership check if applicable
    if (user.role === 'admin' || user.role === 'Admin') {
        return true;
    }

    const userId = String(user._id || user.teamId || user.id || '').trim();
    const userEmail = String(user.email || '').toLowerCase().trim();

    const projectTeamId = String(project.team_id || project.teamId || '').trim();
    const projectEmail = String(project.email || project.userEmail || '').toLowerCase().trim();

    if (userId && projectTeamId && userId === projectTeamId) {
        return true;
    }

    if (userEmail && projectEmail && userEmail === projectEmail) {
        return true;
    }

    return false;
}

module.exports = { checkProjectOwnership };
