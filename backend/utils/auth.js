const jwt = require('jsonwebtoken');
const { getProjectById, getUser } = require('../services/dynamoService');

/**
 * Verify JWT token from Authorization header or event headers.
 * Returns decoded payload or null if invalid/missing.
 */
const verifyToken = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not configured");
        return null;
    }
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

/**
 * Broken Object Level Authorization (BOLA) Check.
 * Checks if a project belongs to a team/user or if the requesting user is an admin.
 *
 * @param {string} projectId - Project identifier (teamId in progress context)
 * @param {object} user - Decoded user object from JWT or middleware (containing email, role, _id, etc.)
 * @returns {Promise<boolean>}
 */
const checkProjectOwnership = async (projectId, user) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    try {
        const project = await getProjectById(projectId);
        if (!project) {
            // If project does not exist, disallow non-admin access
            return false;
        }

        // Check if team_id on project matches user _id
        if (project.team_id && user._id && String(project.team_id) === String(user._id)) {
            return true;
        }

        // Alternatively check user profile by email
        if (user.email) {
            const fullUser = await getUser(user.email);
            if (fullUser && project.team_id && String(project.team_id) === String(fullUser._id)) {
                return true;
            }
        }

        return false;
    } catch (err) {
        console.error("Error in checkProjectOwnership:", err);
        return false;
    }
};

module.exports = {
    verifyToken,
    checkProjectOwnership
};
