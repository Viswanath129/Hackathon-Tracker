/**
 * Verifies that the authenticated user owns the project / team resource.
 * Admin users bypass ownership checks.
 * Uses strict equality checks against user identifiers (teamId, _id, email) to prevent BOLA vulnerabilities.
 */
const checkProjectOwnership = (user, targetTeamId) => {
    if (!user) {
        return false;
    }

    // Admins have full access
    if (user.role === 'admin') {
        return true;
    }

    if (!targetTeamId) {
        return false;
    }

    const target = String(targetTeamId).trim();

    // Strict equality check against user's identifiers
    if (user.teamId && String(user.teamId).trim() === target) {
        return true;
    }
    if (user._id && String(user._id).trim() === target) {
        return true;
    }
    if (user.email && String(user.email).trim().toLowerCase() === target.toLowerCase()) {
        return true;
    }
    if (user.id && String(user.id).trim() === target) {
        return true;
    }

    return false;
};

module.exports = { checkProjectOwnership };
