/**
 * Centralized authorization utility to prevent BOLA (Broken Object Level Authorization) vulnerabilities.
 * Shared between Express middleware/controllers and AWS Lambda handlers.
 */

const checkProjectOwnership = (user, projectOrTeamId) => {
    if (!user) {
        return false;
    }

    // Admins bypass ownership checks
    if (user.role === 'admin') {
        return true;
    }

    if (!projectOrTeamId) {
        return false;
    }

    const userId = user._id ? String(user._id) : null;
    const userEmail = user.email ? String(user.email).toLowerCase() : null;
    const userLoginEmail = user.loginEmail ? String(user.loginEmail).toLowerCase() : null;
    const userTeamId = user.teamId ? String(user.teamId) : null;

    if (typeof projectOrTeamId === 'string') {
        const targetId = projectOrTeamId.trim();

        // Strict equality checks against user identifiers
        if (userId && userId === targetId) return true;
        if (userTeamId && userTeamId === targetId) return true;
        if (userEmail && userEmail === targetId.toLowerCase()) return true;
        if (userLoginEmail && userLoginEmail === targetId.toLowerCase()) return true;

        return false;
    }

    if (typeof projectOrTeamId === 'object') {
        const project = projectOrTeamId;
        const projId = project._id ? String(project._id) : null;
        const projTeamId = project.teamId ? String(project.teamId) : null;
        const projOwnerEmail = project.ownerEmail ? String(project.ownerEmail).toLowerCase() : null;
        const projUserEmail = project.email ? String(project.email).toLowerCase() : null;

        if (userId && (userId === projId || userId === projTeamId)) return true;
        if (userTeamId && (userTeamId === projId || userTeamId === projTeamId)) return true;
        if (userEmail && (userEmail === projOwnerEmail || userEmail === projUserEmail)) return true;
        if (userLoginEmail && (userLoginEmail === projOwnerEmail || userLoginEmail === projUserEmail)) return true;

        return false;
    }

    return false;
};

module.exports = { checkProjectOwnership };
