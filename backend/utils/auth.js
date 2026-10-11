/**
 * Centralized project ownership authorization utility
 */
const checkProjectOwnership = (user, project) => {
    if (!user || !project) {
        return false;
    }

    if (user.role === 'admin') {
        return true;
    }

    const userId = user._id || user.team_id || user.teamId || user.email;
    const projectOwnerId = project.team_id || project.teamId || project._id || (project.PK ? project.PK.replace('PROJ#', '').replace('USER#', '') : null);

    if (!userId || !projectOwnerId) {
        return false;
    }

    // Strict equality check to prevent Broken Object Level Authorization (BOLA)
    if (String(userId) === String(projectOwnerId)) {
        return true;
    }

    if (user.email && project.email && String(user.email) === String(project.email)) {
        return true;
    }

    return false;
};

module.exports = { checkProjectOwnership };
