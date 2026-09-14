function checkProjectOwnership(user, project) {
    if (!user || !project) return false;
    if (user.role === 'admin') return true;

    // Strict equality checks against user identifiers
    if (project.teamId && user._id && String(project.teamId) === String(user._id)) return true;
    if (project._id && user._id && String(project._id) === String(user._id)) return true;
    if (project.email && user.email && project.email.toLowerCase() === user.email.toLowerCase()) return true;
    if (project.teamEmail && user.email && project.teamEmail.toLowerCase() === user.email.toLowerCase()) return true;

    return false;
}

module.exports = { checkProjectOwnership };
