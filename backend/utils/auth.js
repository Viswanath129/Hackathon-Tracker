const jwt = require('jsonwebtoken');

/**
 * Verifies JWT authorization header.
 *
 * @param {string} authHeader
 * @returns {object|null} Decoded payload or null if invalid/missing
 */
function verifyToken(authHeader) {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : authHeader;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('JWT_SECRET process variable is missing');
        return null;
    }

    try {
        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch (err) {
        return null;
    }
}

/**
 * Checks if the user owns or is authorized for the project.
 *
 * @param {object} user - Decoded user or user object from req/token
 * @param {object} project - Project object from DB
 * @returns {boolean}
 */
function checkProjectOwnership(user, project) {
    if (!user || !project) return false;

    // Admin role override
    if (user.role === 'admin') return true;

    // Check project teamId or owner against user identifiers
    const userIdentifiers = [user.teamId, user._id, user.id, user.email].filter(Boolean);

    if (project.teamId && userIdentifiers.some(id => String(id) === String(project.teamId))) {
        return true;
    }

    if (project.owner && userIdentifiers.some(id => String(id) === String(project.owner))) {
        return true;
    }

    if (project.userEmail && userIdentifiers.some(id => String(id) === String(project.userEmail))) {
        return true;
    }

    return false;
}

module.exports = {
    verifyToken,
    checkProjectOwnership
};
