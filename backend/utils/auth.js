/**
 * Centralized authorization check to prevent BOLA vulnerabilities.
 * Performs strict equality checks against user identifiers vs project attributes.
 */
const checkProjectOwnership = (user, project) => {
    if (!user || !project) return false;

    // Admin role bypass
    if (user.role === 'admin') return true;

    const userEmail = (user.email || user.loginEmail || user.username || '').toLowerCase();
    const userId = user._id || user.id || user.teamId || user.sub;

    const projectOwnerEmail = (project.teamEmail || project.email || project.ownerEmail || project.userEmail || '').toLowerCase();
    const projectTeamId = project.teamId || project.user_id || project.ownerId || project.userId || project.PK?.replace('USER#', '')?.replace('HACK#', '');

    // Strict equality check against email
    if (userEmail && projectOwnerEmail && userEmail === projectOwnerEmail) {
        return true;
    }

    // Strict equality check against team/user identifier
    if (userId && projectTeamId && String(userId) === String(projectTeamId)) {
        return true;
    }

    if (user.teamId && (String(user.teamId) === String(project._id) || String(user.teamId) === String(project.teamId))) {
        return true;
    }

    if (user._id && (String(user._id) === String(project.teamId) || String(user._id) === String(project._id))) {
        return true;
    }

    return false;
};

module.exports = { checkProjectOwnership };
