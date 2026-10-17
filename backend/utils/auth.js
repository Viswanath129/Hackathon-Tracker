/**
 * Authorization check for project ownership to prevent BOLA vulnerabilities.
 * Centralized logic using strict equality checks.
 */
const checkProjectOwnership = (user, project) => {
    if (!user || !project) {
        return false;
    }

    // Admins have universal access
    if (user.role === 'admin') {
        return true;
    }

    let projectTeamId = null;
    let projectEmail = null;
    let projId = null;

    if (typeof project === 'string') {
        projectTeamId = project;
    } else if (typeof project === 'object') {
        projectTeamId = project.teamId || project.projectId || project._id;
        projectEmail = project.email || project.userEmail;
        projId = project._id;
    }

    // Strict equality checks against user identifiers
    if (user.teamId && projectTeamId && user.teamId === projectTeamId) {
        return true;
    }
    if (user._id && projectTeamId && user._id === projectTeamId) {
        return true;
    }
    if (user._id && projId && user._id === projId) {
        return true;
    }
    if (user.email && projectEmail && user.email === projectEmail) {
        return true;
    }
    if (user.email && projectTeamId && user.email === projectTeamId) {
        return true;
    }
    if (user.loginEmail && projectEmail && user.loginEmail === projectEmail) {
        return true;
    }
    if (user.loginEmail && projectTeamId && user.loginEmail === projectTeamId) {
        return true;
    }

    return false;
};

module.exports = { checkProjectOwnership };
