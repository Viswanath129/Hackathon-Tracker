/**
 * Centralized authorization utility for project ownership checking.
 * Shared across Express controllers and Lambda handlers to prevent BOLA vulnerabilities.
 */
function checkProjectOwnership(user, project) {
    if (!user || !project) return false;

    // Admin role bypass
    if (user.role === 'admin') return true;

    // Strict equality checks for user identifiers against project attributes
    const userIdentifiers = [
        user.teamId,
        user._id,
        user.id,
        user.email ? user.email.toLowerCase() : null
    ].filter(Boolean);

    const projectIdentifiers = [
        project.teamId,
        project.team_id,
        project._id,
        project.id,
        project.email ? project.email.toLowerCase() : null,
        project.user_email ? project.user_email.toLowerCase() : null,
        project.createdBy ? project.createdBy.toLowerCase() : null
    ].filter(Boolean);

    for (const userId of userIdentifiers) {
        for (const projId of projectIdentifiers) {
            if (userId === projId) {
                return true;
            }
        }
    }

    return false;
}

module.exports = { checkProjectOwnership };
