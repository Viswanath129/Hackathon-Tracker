/**
 * Validates ownership/authorization of a project by a user.
 * Admin users are granted access automatically.
 * Non-admin users are strictly compared against project ownership fields.
 */
const checkProjectOwnership = (user, project) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!project) return false;

    // Strict equality checks against possible project identifier properties
    if (project.teamId && (project.teamId === user.teamId || project.teamId === user._id || project.teamId === user.email)) {
        return true;
    }
    if (project.ownerId && (project.ownerId === user._id || project.ownerId === user.email || project.ownerId === user.teamId)) {
        return true;
    }
    if (project.userId && (project.userId === user._id || project.userId === user.email || project.userId === user.teamId)) {
        return true;
    }
    if (project.userEmail && (project.userEmail.toLowerCase() === user.email?.toLowerCase())) {
        return true;
    }

    return false;
};

module.exports = { checkProjectOwnership };
