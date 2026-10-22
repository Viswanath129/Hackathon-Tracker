/**
 * Authorization helper to verify whether a user owns or belongs to a project.
 * Performs strict equality checks against user identifiers (_id, teamId, email, loginEmail)
 * to prevent BOLA vulnerabilities.
 */
const checkProjectOwnership = (user, project) => {
    if (!user || !project) return false;

    // Admins bypass ownership check
    if (user.role === 'admin') return true;

    // Extract potential user IDs and project team/owner identifiers
    const userIds = [user._id, user.teamId, user.id, user.email, user.loginEmail].filter(Boolean);
    const projectOwners = [project.teamId, project.userId, project.ownerId, project.email, project.PK ? project.PK.replace('HACK#', '') : null].filter(Boolean);

    // Strict equality check across identifier lists
    for (const uid of userIds) {
        for (const ownerId of projectOwners) {
            if (String(uid) === String(ownerId)) {
                return true;
            }
        }
    }

    // Check members array if present on project or user
    if (Array.isArray(project.members) && (user.email || user.loginEmail)) {
        const uEmail = user.loginEmail || user.email;
        if (project.members.some(m => typeof m === 'string' ? m === uEmail : m.email === uEmail)) {
            return true;
        }
    }

    return false;
};

module.exports = { checkProjectOwnership };
