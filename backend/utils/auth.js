/**
 * Checks project ownership to prevent BOLA (Broken Object Level Authorization).
 * Admin users are granted access automatically.
 * Non-admin users are strictly checked against teamId, _id, email, ownerId, etc.
 */
function checkProjectOwnership(user, project) {
    if (!user || !project) {
        return false;
    }

    // Admin role override
    if (user.role === 'admin') {
        return true;
    }

    // Identifiers for user
    const userId = user._id || user.id;
    const userTeamId = user.teamId;
    const userEmail = user.email;

    // Identifiers on project
    const projTeamId = project.teamId;
    const projOwnerId = project.ownerId || project.userId;
    const projEmail = project.email;
    const projId = project._id || project.id;
    const projPK = project.PK; // e.g., 'USER#email' or 'HACK#hackId'

    // Perform strict equality checks against user identifiers
    if (userId && (projTeamId === userId || projOwnerId === userId || projId === userId)) {
        return true;
    }

    if (userTeamId && (projTeamId === userTeamId || projOwnerId === userTeamId || projId === userTeamId)) {
        return true;
    }

    if (userEmail) {
        if (projEmail === userEmail || projTeamId === userEmail || projOwnerId === userEmail) {
            return true;
        }
        if (projPK === `USER#${userEmail.toLowerCase()}`) {
            return true;
        }
    }

    return false;
}

module.exports = {
    checkProjectOwnership
};
