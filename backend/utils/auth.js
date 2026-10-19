/**
 * Centralized authorization check for project ownership.
 * Performs strict equality checks against user identifiers to prevent BOLA vulnerabilities.
 */
const checkProjectOwnership = (user, project) => {
    if (!user || !project) return false;

    if (user.role === 'admin') {
        return true;
    }

    const userIdentifiers = [user._id, user.teamId, user.team_id, user.email].filter(Boolean);
    const projectIdentifiers = [project.team_id, project.teamId, project._id, project.userId, project.user_id, project.email].filter(Boolean);

    for (const uId of userIdentifiers) {
        for (const pId of projectIdentifiers) {
            if (uId === pId) {
                return true;
            }
        }
    }

    return false;
};

module.exports = { checkProjectOwnership };
