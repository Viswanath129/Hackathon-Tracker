/**
 * Check project ownership for Broken Object Level Authorization (BOLA) checks
 */
function checkProjectOwnership(user, project) {
    if (!user) return false;
    if (user.role === 'admin') return true;

    if (!project) return false;

    // Check project user/team/owner associations with strict equality
    if (project.teamId && String(project.teamId) === String(user.teamId || user._id || user.id)) {
        return true;
    }

    if (project.userId && String(project.userId) === String(user._id || user.id || user.userId)) {
        return true;
    }

    if (project.email && user.email && String(project.email).toLowerCase() === String(user.email).toLowerCase()) {
        return true;
    }

    if (project.owner && (
        String(project.owner) === String(user._id || user.id) ||
        String(project.owner).toLowerCase() === String(user.email || '').toLowerCase()
    )) {
        return true;
    }

    // Check PK/SK patterns if present on project (e.g. PK: HACK#<id>, SK: PROJ#<id>)
    if (project.PK && user.email && project.PK === `USER#${user.email.toLowerCase()}`) {
        return true;
    }

    return false;
}

module.exports = { checkProjectOwnership };
