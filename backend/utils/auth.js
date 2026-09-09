const dynamoService = require('../services/dynamoService');

/**
 * Centralized authorization check to prevent Broken Object Level Authorization (BOLA).
 * Verifies if a user owns or has authorization to access/modify a specific project.
 */
const checkProjectOwnership = async (user, projectId) => {
    if (!user) return false;

    // Admin role bypasses project level ownership checks
    if (user.role === 'admin') return true;

    if (!projectId) return false;

    try {
        const project = await dynamoService.getProjectById(projectId);
        if (project) {
            return (
                project.team_id === user._id ||
                project.team_id === user.email ||
                (user.email && project.PK === `USER#${user.email.toLowerCase()}`)
            );
        }

        // Direct match if projectId matches user ID or email
        if (user._id === projectId || (user.email && user.email.toLowerCase() === projectId.toLowerCase())) {
            return true;
        }

        return false;
    } catch (error) {
        console.error("Error during project ownership check:", error);
        return false;
    }
};

module.exports = { checkProjectOwnership };
