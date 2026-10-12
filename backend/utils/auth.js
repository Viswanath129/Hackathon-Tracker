/**
 * Centralized authorization check for project ownership to prevent BOLA vulnerabilities.
 * Uses strict equality checks against user and project identifiers.
 */
const checkProjectOwnership = (user, project) => {
    if (!user || !project) {
        return false;
    }

    // Admins have access to all projects
    if (user.role === 'admin') {
        return true;
    }

    const userId = user._id ? String(user._id) : null;
    const userTeamId = user.teamId ? String(user.teamId) : null;
    const userEmail = user.email ? String(user.email).toLowerCase() : null;
    const loginEmail = user.loginEmail ? String(user.loginEmail).toLowerCase() : null;

    const projTeamId = project.teamId ? String(project.teamId) : null;
    const projId = project._id ? String(project._id) : null;
    const projUserEmail = project.userEmail ? String(project.userEmail).toLowerCase() : null;
    const projEmail = project.email ? String(project.email).toLowerCase() : null;

    // Strict equality matching against project team/user identifiers
    if (userTeamId && projTeamId && userTeamId === projTeamId) return true;
    if (userId && projTeamId && userId === projTeamId) return true;
    if (userTeamId && projId && userTeamId === projId) return true;
    if (userId && projId && userId === projId) return true;

    if (userEmail && projUserEmail && userEmail === projUserEmail) return true;
    if (userEmail && projEmail && userEmail === projEmail) return true;
    if (loginEmail && projUserEmail && loginEmail === projUserEmail) return true;
    if (loginEmail && projEmail && loginEmail === projEmail) return true;

    // Check DynamoDB PK format USER#<email>
    if (project.PK && typeof project.PK === 'string') {
        const pkEmail = project.PK.replace(/^USER#/i, '').toLowerCase();
        if (userEmail && userEmail === pkEmail) return true;
        if (loginEmail && loginEmail === pkEmail) return true;
    }

    return false;
};

module.exports = { checkProjectOwnership };
