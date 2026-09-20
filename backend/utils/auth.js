const jwt = require('jsonwebtoken');

/**
 * Authorization check for project ownership.
 * Performs strict equality checks against project identifiers / team identifiers.
 * Admin users bypass team ownership check.
 */
function checkProjectOwnership(user, project) {
    if (!user || !project) return false;

    if (user.role === 'admin') return true;

    const userIdentifiers = [
        user.teamId,
        user._id,
        user.email,
        user.loginEmail,
        user.PK ? user.PK.replace('USER#', '') : null
    ].filter(Boolean);

    const projectIdentifiers = [
        project.teamId,
        project.userId,
        project.email,
        project.PK ? project.PK.replace('HACK#', '') : null,
        project.PK ? project.PK.replace('USER#', '') : null
    ].filter(Boolean);

    return userIdentifiers.some(uId =>
        projectIdentifiers.some(pId => String(uId).toLowerCase() === String(pId).toLowerCase())
    );
}

/**
 * Extracts and verifies JWT token from Authorization header or event headers.
 */
function verifyToken(authHeader) {
    if (!authHeader || typeof authHeader !== 'string') return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('JWT_SECRET is not configured');
        return null;
    }

    try {
        return jwt.verify(parts[1], secret);
    } catch (err) {
        return null;
    }
}

module.exports = { checkProjectOwnership, verifyToken };
