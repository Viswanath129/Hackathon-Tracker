/**
 * Centralized authorization check for project ownership.
 * Performs strict equality checks against user identifiers (such as teamId, _id, email, loginEmail)
 * rather than substring matching to prevent BOLA vulnerabilities.
 */
const checkProjectOwnership = (user, project) => {
    if (!user || !project) {
        return false;
    }

    // Admins have access to all projects
    if (user.role === 'admin') {
        return true;
    }

    // Extract all candidate user identifiers
    const userIdentifiers = [
        user.teamId,
        user._id,
        user.email,
        user.loginEmail,
        user.id
    ].filter(id => id !== undefined && id !== null && String(id).trim() !== '');

    // Extract all candidate project owner identifiers
    const projectIdentifiers = [
        project.teamId,
        project._id,
        project.email,
        project.userId,
        project.userEmail
    ].filter(id => id !== undefined && id !== null && String(id).trim() !== '');

    // Perform strict equality checks across identifiers
    for (const userId of userIdentifiers) {
        for (const projId of projectIdentifiers) {
            if (String(userId) === String(projId)) {
                return true;
            }
        }
    }

    return false;
};

module.exports = { checkProjectOwnership };
