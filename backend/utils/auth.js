const dynamoService = require('../services/dynamoService');

/**
 * Authorization helper to verify project/team ownership
 * Enforces Broken Object Level Authorization (BOLA) protections
 */
async function checkProjectOwnership(user, targetProjectId) {
    if (!user || !targetProjectId) {
        return false;
    }

    // Admins have access to all projects
    if (user.role === 'admin') {
        return true;
    }

    const userEmail = (user.email || user.loginEmail || '').toLowerCase();
    const userId = user._id || user.id || user.teamId || user.projectId;

    // Check direct parameter matches
    if (userId === targetProjectId || user.teamId === targetProjectId || user.projectId === targetProjectId) {
        return true;
    }

    if (userEmail && (userEmail === targetProjectId.toLowerCase())) {
        return true;
    }

    // Lookup project in DynamoDB if needed
    try {
        const project = await dynamoService.getProjectById(targetProjectId);
        if (project) {
            if (project.teamId === userId || project.team_id === userId || project._id === targetProjectId) {
                return true;
            }

            if (project.email && project.email.toLowerCase() === userEmail) {
                return true;
            }

            if (project.userEmail && project.userEmail.toLowerCase() === userEmail) {
                return true;
            }

            // Check if project PK is HACK#<hackId> owned by user
            if (project.PK && project.PK.startsWith('HACK#')) {
                const hackId = project.PK.replace('HACK#', '');
                const userHackathons = await dynamoService.getHackathonsByUser(userEmail);
                if (userHackathons && userHackathons.some(h => h._id === hackId || h.SK === `HACK#${hackId}`)) {
                    return true;
                }
            }
        }
    } catch (err) {
        console.error('Error in checkProjectOwnership:', err);
    }

    return false;
}

module.exports = { checkProjectOwnership };
