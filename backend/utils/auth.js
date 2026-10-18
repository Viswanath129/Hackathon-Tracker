const jwt = require('jsonwebtoken');

/**
 * Verifies JWT token from Authorization header or raw token string.
 * Enforces mandatory JWT_SECRET.
 *
 * @param {string} authHeader
 * @returns {Object} decoded payload
 */
function verifyToken(authHeader) {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === '') {
        throw new Error('JWT_SECRET is not configured');
    }

    if (!authHeader || typeof authHeader !== 'string') {
        throw new Error('Authorization header missing or invalid');
    }

    let token = authHeader;
    if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token || token.trim() === '') {
        throw new Error('Token string is empty');
    }

    return jwt.verify(token, secret);
}

/**
 * Performs strict ownership check to prevent BOLA vulnerabilities.
 * Checks whether user has ownership of target project or team ID, or is an admin.
 * Uses strict equality rather than substring matching.
 *
 * @param {Object} user
 * @param {string|Object} projectOrTeamId
 * @returns {boolean}
 */
function checkProjectOwnership(user, projectOrTeamId) {
    if (!user || typeof user !== 'object') {
        return false;
    }

    if (user.role === 'admin') {
        return true;
    }

    let targetId = projectOrTeamId;
    if (projectOrTeamId && typeof projectOrTeamId === 'object') {
        targetId = projectOrTeamId.teamId || projectOrTeamId._id || projectOrTeamId.id;
    }

    if (!targetId || typeof targetId !== 'string') {
        return false;
    }

    const userIdCandidates = [user.teamId, user._id, user.id, user.email, user.loginEmail]
        .filter(id => typeof id === 'string' && id.trim() !== '');

    return userIdCandidates.some(id => id === targetId);
}

module.exports = {
    verifyToken,
    checkProjectOwnership
};
