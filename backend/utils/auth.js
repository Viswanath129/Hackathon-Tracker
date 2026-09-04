const dynamoService = require('../services/dynamoService');

/**
 * Checks if a user has ownership/authorization for a given team/project ID (BOLA prevention).
 * Admins are granted access to all projects.
 * Non-admins can access if they own the team or are listed in the project's team members.
 */
const checkProjectOwnership = async (user, teamId) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    // Check if teamId matches user's own email/team ID
    const userEmail = (user.loginEmail || user.email || '').toLowerCase();
    const targetTeamId = String(teamId).toLowerCase();

    if (userEmail === targetTeamId) return true;

    // Check projects in DynamoDB
    const allProjects = await dynamoService.getAllProjects();
    const project = allProjects.find(p => p._id === teamId || p.PK === `PROJ#${teamId}` || p.teamId === teamId);

    if (!project) {
        // If teamId directly refers to user account or team email
        const userAccount = await dynamoService.getUser(teamId);
        if (userAccount && userAccount.email.toLowerCase() === userEmail) {
            return true;
        }
        return false;
    }

    if (project.userEmail && project.userEmail.toLowerCase() === userEmail) {
        return true;
    }

    if (project.members && Array.isArray(project.members)) {
        return project.members.some(m => (m.email || '').toLowerCase() === userEmail);
    }

    return false;
};

module.exports = {
    checkProjectOwnership
};
