const dynamoService = require('../services/dynamoService');

/**
 * Verifies project ownership for Broken Object Level Authorization (BOLA) checks.
 * Admins are automatically authorized.
 * Non-admins must own or be associated with the project.
 */
const checkProjectOwnership = async (user, projectId) => {
    if (!user || !projectId) {
        return false;
    }

    if (user.role === 'admin') {
        return true;
    }

    try {
        const project = await dynamoService.getProjectById(projectId);
        if (!project) {
            return false;
        }

        // Direct user ID / team ID checks
        if (project.team_id && user._id && String(project.team_id) === String(user._id)) {
            return true;
        }

        if (project.user_id && user._id && String(project.user_id) === String(user._id)) {
            return true;
        }

        // Email checks
        const userEmails = [user.email, user.loginEmail].filter(Boolean).map(e => e.toLowerCase());
        if (project.email && userEmails.includes(project.email.toLowerCase())) {
            return true;
        }

        // Hackathon ownership check: project.PK is HACK#<hackId>
        if (project.PK && project.PK.startsWith('HACK#')) {
            const hackId = project.PK.replace('HACK#', '');
            if (user.email) {
                const userHacks = await dynamoService.getHackathonsByUser(user.email);
                if (userHacks && userHacks.some(h => h._id === hackId || h.SK === `HACK#${hackId}`)) {
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        console.error("Project Ownership Check Error:", error);
        return false;
    }
};

module.exports = { checkProjectOwnership };
