const dynamoService = require('../services/dynamoService');

/**
 * Checks if a user has ownership/access to a given project or team resource.
 * Admin users are granted universal access.
 * Non-admin users are checked against project team_id or user IDs.
 */
const checkProjectOwnership = async (user, targetId) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!targetId) return false;

    // Check direct equality on user identity / team_id
    if (user._id === targetId || user.email === targetId || user.team_id === targetId) {
        return true;
    }

    // Attempt to lookup project by ID in DynamoDB
    try {
        if (dynamoService && typeof dynamoService.getProjectById === 'function') {
            const project = await dynamoService.getProjectById(targetId);
            if (project) {
                if (project.team_id === user._id || project.team_id === user.email || project.email === user.email) {
                    return true;
                }
            }
        }
    } catch (err) {
        console.error("Error in checkProjectOwnership lookup:", err);
    }

    return false;
};

module.exports = {
    checkProjectOwnership
};
