/**
 * Centralized project ownership authorization check.
 * Performs strict equality checks against user identifiers to prevent BOLA vulnerabilities.
 */
const checkProjectOwnership = (user, project) => {
    if (!user || !project) {
        return false;
    }

    // Admins have access to all projects
    if (user.role === 'admin') {
        return true;
    }

    const userIds = [
        user._id,
        user.teamId,
        user.email,
        user.loginEmail
    ].filter(Boolean).map(id => String(id).trim().toLowerCase());

    const projectIds = [
        project.teamId,
        project.team,
        project.userId,
        project.userEmail,
        project.email,
        project._id,
        project.user
    ].filter(Boolean).map(id => String(id).trim().toLowerCase());

    // Check strict equality against user identifiers
    for (const uId of userIds) {
        for (const pId of projectIds) {
            if (uId === pId) {
                return true;
            }
        }
    }

    // Check team members if present
    if (Array.isArray(project.members)) {
        for (const member of project.members) {
            const memberEmail = typeof member === 'string' ? member : member?.email;
            if (memberEmail && userIds.includes(String(memberEmail).trim().toLowerCase())) {
                return true;
            }
        }
    }

    return false;
};

module.exports = { checkProjectOwnership };
