/**
 * Authorization helper to verify project ownership.
 * Centralizes ownership check using strict equality comparisons on user identifiers.
 */
function checkProjectOwnership(user, project) {
    if (!user || !project) {
        return false;
    }

    // Admins bypass ownership checks
    if (user.role === 'admin') {
        return true;
    }

    const userId = user._id || user.id || user.teamId || user.email;
    const projectOwnerId = project.teamId || project.userId || project.ownerId || project.email;

    if (!userId || !projectOwnerId) {
        return false;
    }

    return String(userId) === String(projectOwnerId);
}

module.exports = { checkProjectOwnership };
