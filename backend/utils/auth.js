/**
 * Shared project authorization utility for BOLA protection
 */
const checkProjectOwnership = (user, project) => {
    if (!user || !project) {
        return false;
    }

    if (user.role === 'admin') {
        return true;
    }

    const userId = user._id ? String(user._id) : null;
    const userTeamId = user.teamId ? String(user.teamId) : null;
    const userEmail = user.email ? String(user.email).toLowerCase() : null;
    const userLoginEmail = user.loginEmail ? String(user.loginEmail).toLowerCase() : null;

    const projId = project._id ? String(project._id) : null;
    const projTeamId = project.teamId ? String(project.teamId) : null;
    const projUserId = project.userId ? String(project.userId) : null;
    const projEmail = project.email ? String(project.email).toLowerCase() : null;
    const projPk = project.PK ? String(project.PK).toLowerCase() : null;

    // Strict equality checks against user identifiers
    if (userId && (projId === userId || projTeamId === userId || projUserId === userId)) {
        return true;
    }

    if (userTeamId && (projId === userTeamId || projTeamId === userTeamId || projUserId === userTeamId)) {
        return true;
    }

    if (userEmail) {
        if (projEmail === userEmail || projPk === `user#${userEmail}`) {
            return true;
        }
    }

    if (userLoginEmail) {
        if (projEmail === userLoginEmail || projPk === `user#${userLoginEmail}`) {
            return true;
        }
    }

    return false;
};

module.exports = { checkProjectOwnership };
