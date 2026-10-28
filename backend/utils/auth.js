/**
 * Project ownership and BOLA verification utilities
 */

const checkProjectOwnership = (user, project) => {
    if (!user || !project) {
        return false;
    }

    // Admins have access to all projects
    if (user.role === 'admin') {
        return true;
    }

    // Check project teamId or ownerId against user's teamId or _id or email
    const userId = user._id ? String(user._id) : null;
    const userTeamId = user.teamId ? String(user.teamId) : null;
    const userEmail = user.email ? String(user.email).toLowerCase() : null;
    const loginEmail = user.loginEmail ? String(user.loginEmail).toLowerCase() : null;

    const projTeamId = project.teamId ? String(project.teamId) : null;
    const projOwnerId = project.ownerId ? String(project.ownerId) : null;
    const projUserEmail = project.userEmail ? String(project.userEmail).toLowerCase() : null;
    const projPK = project.PK ? String(project.PK) : null;

    // Strict equality checks
    if (projTeamId && (projTeamId === userTeamId || projTeamId === userId)) {
        return true;
    }

    if (projOwnerId && (projOwnerId === userId || projOwnerId === userTeamId)) {
        return true;
    }

    if (projUserEmail && (projUserEmail === userEmail || projUserEmail === loginEmail)) {
        return true;
    }

    if (projPK && userEmail && projPK === `USER#${userEmail}`) {
        return true;
    }

    // If project has hackathon email association (PK: USER#email)
    if (project.PK && project.PK.startsWith('USER#')) {
        const pkEmail = project.PK.replace('USER#', '').toLowerCase();
        if (pkEmail === userEmail || pkEmail === loginEmail) {
            return true;
        }
    }

    // Fallback match on project _id if user's teamId or _id matches
    if (project._id) {
        const projId = String(project._id);
        if (projId === userTeamId || projId === userId) {
            return true;
        }
    }

    return false;
};

module.exports = { checkProjectOwnership };
