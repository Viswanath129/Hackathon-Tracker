/**
 * Verifies whether a user/actor has ownership or authorization for a given project.
 * Uses strict equality comparisons to prevent Broken Object Level Authorization (BOLA) vulnerabilities.
 *
 * @param {Object} project - Project entity retrieved from DynamoDB or storage
 * @param {Object} user - User/Team context from request or verified JWT token
 * @returns {boolean} - true if authorized, false otherwise
 */
function checkProjectOwnership(project, user) {
    if (!project || !user) {
        return false;
    }

    // Admin override
    if (user.role === 'admin' || user.isAdmin === true) {
        return true;
    }

    // Strict equality checks against potential owner attributes
    const userId = user._id || user.id || user.sub || user.team_id;
    const userEmail = user.email ? user.email.toLowerCase() : null;

    if (project.team_id && userId && String(project.team_id) === String(userId)) {
        return true;
    }

    if (project.user_id && userId && String(project.user_id) === String(userId)) {
        return true;
    }

    if (project.owner_email && userEmail && String(project.owner_email).toLowerCase() === userEmail) {
        return true;
    }

    if (project.email && userEmail && String(project.email).toLowerCase() === userEmail) {
        return true;
    }

    return false;
}

module.exports = {
    checkProjectOwnership
};
