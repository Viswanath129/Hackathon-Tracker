/**
 * Centralized authorization utility for project access verification.
 * Enforces strict equality checks on user and project identifiers to prevent BOLA vulnerabilities.
 *
 * @param {Object} user - Authenticated user object from JWT or middleware
 * @param {Object} [project] - Project object retrieved from DynamoDB/data store
 * @param {string} [requestedTeamId] - Target project/team ID from request
 * @returns {boolean} True if authorized, false otherwise
 */
const checkProjectOwnership = (user, project, requestedTeamId) => {
    if (!user || typeof user !== 'object') {
        return false;
    }

    // Admins have global access
    if (user.role === 'admin') {
        return true;
    }

    const userIdentifiers = [
        user._id,
        user.teamId,
        user.email,
        user.loginEmail
    ].filter(id => typeof id === 'string' && id.trim().length > 0);

    // If requestedTeamId is specified, verify user owns that teamId
    if (requestedTeamId && typeof requestedTeamId === 'string') {
        const matchesRequested = userIdentifiers.some(id => id === requestedTeamId);
        if (!matchesRequested) {
            return false;
        }
    }

    // If project object is provided, verify project ownership
    if (project && typeof project === 'object') {
        const projectIdentifiers = [
            project._id,
            project.teamId,
            project.email,
            project.userEmail
        ].filter(id => typeof id === 'string' && id.trim().length > 0);

        const isOwner = userIdentifiers.some(uId =>
            projectIdentifiers.some(pId => uId === pId)
        );

        if (!isOwner) {
            return false;
        }
    }

    return true;
};

module.exports = { checkProjectOwnership };
