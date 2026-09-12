const jwt = require('jsonwebtoken');

/**
 * Validates JWT token from authorization header.
 * Ensures JWT_SECRET is configured in process.env.
 */
const verifyToken = (authHeader) => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === '') {
        throw new Error('JWT_SECRET is not configured');
    }

    if (!authHeader || typeof authHeader !== 'string') {
        throw new Error('Authorization header missing');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        throw new Error('Invalid Authorization header format');
    }

    const token = parts[1];
    return jwt.verify(token, secret);
};

/**
 * Checks if a user has ownership/access to a target project or team resource.
 * Performs strict equality checks to prevent BOLA (Broken Object Level Authorization) vulnerabilities.
 */
const checkProjectOwnership = (user, project) => {
    if (!user) {
        return false;
    }

    // Admins have universal access
    if (user.role === 'admin') {
        return true;
    }

    if (!project) {
        return false;
    }

    // If project is passed as an object containing identifiers
    if (typeof project === 'object') {
        const projId = project._id || project.id || project.teamId || project.projectId;
        const projOwner = project.email || project.ownerEmail || project.userEmail || project.teamId;

        if (user.email && projOwner && user.email.toLowerCase() === String(projOwner).toLowerCase()) {
            return true;
        }

        if (user.teamId && projId && String(user.teamId) === String(projId)) {
            return true;
        }

        if (user._id && projId && String(user._id) === String(projId)) {
            return true;
        }

        if (user.teamId && project.teamId && String(user.teamId) === String(project.teamId)) {
            return true;
        }

        if (user._id && project.teamId && String(user._id) === String(project.teamId)) {
            return true;
        }

        return false;
    }

    // If project is passed directly as a string ID/teamId
    if (typeof project === 'string') {
        const targetId = project.trim();
        if (user.teamId && String(user.teamId) === targetId) {
            return true;
        }
        if (user._id && String(user._id) === targetId) {
            return true;
        }
        if (user.email && user.email.toLowerCase() === targetId.toLowerCase()) {
            return true;
        }
        return false;
    }

    return false;
};

module.exports = {
    verifyToken,
    checkProjectOwnership
};
