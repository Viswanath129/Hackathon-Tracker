/**
 * Check if the given project belongs to the given user or team.
 * Admin role bypasses the check.
 * Strictly checks user identifiers against team_id, _id, or email.
 */
const checkProjectOwnership = (user, project) => {
    if (!user || !project) return false;

    // Admin access
    if (user.role === 'admin') return true;

    const userEmail = (user.email || user.loginEmail) ? (user.email || user.loginEmail).toLowerCase() : null;
    const projectEmail = project.email ? String(project.email).toLowerCase() : null;

    if (project.team_id && (
        String(project.team_id) === String(user._id) ||
        String(project.team_id) === String(user.team_id) ||
        String(project.team_id) === String(user.id)
    )) {
        return true;
    }

    if (projectEmail && userEmail && projectEmail === userEmail) {
        return true;
    }

    return false;
};

module.exports = { checkProjectOwnership };
