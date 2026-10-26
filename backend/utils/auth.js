/**
 * Centralized authorization check to prevent BOLA (Broken Object Level Authorization).
 * Enforces strict equality checks against user identifiers (teamId, _id, email, etc.)
 * rather than substring matching.
 *
 * Admins are authorized for any project.
 * Regular users must own the project via direct matching on teamId, _id, or email.
 */
function checkProjectOwnership(user, project) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!project) return false;

    // Direct equality checks against user properties
    if (user.teamId && project.teamId === user.teamId) return true;
    if (user._id && (project.teamId === user._id || project._id === user._id || project.userId === user._id)) return true;
    if (user.email && (project.email === user.email || project.userId === user.email)) return true;
    if (user.loginEmail && (project.email === user.loginEmail || project.userId === user.loginEmail)) return true;

    return false;
}

module.exports = { checkProjectOwnership };
