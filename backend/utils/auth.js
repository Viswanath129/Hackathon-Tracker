const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');

/**
 * Verifies JWT token and checks secret configuration.
 */
const verifyToken = (authHeaderOrToken) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.trim() === '') {
        throw new Error('JWT_SECRET is not configured');
    }

    let token = authHeaderOrToken;
    if (token && typeof token === 'string' && token.startsWith('Bearer ')) {
        token = token.split(' ')[1];
    }

    if (!token) {
        throw new Error('No token provided');
    }

    return jwt.verify(token, jwtSecret);
};

/**
 * Centralized Broken Object Level Authorization (BOLA) check.
 * Checks if a user is authorized to perform operations on a specific project.
 */
const checkProjectOwnership = async (user, projectId) => {
    if (!user) return false;

    // Admins have access to all projects
    if (user.role === 'admin') return true;

    // Fetch project if needed
    const project = await dynamoService.getProjectById(projectId);
    if (!project) return false;

    // Check if team ID or user ID matches
    const userId = user._id || user.id;
    const teamId = user.team_id || userId;

    if (project.team_id && (project.team_id === teamId || project.team_id === userId)) {
        return true;
    }

    if (project.email && user.email && project.email.toLowerCase() === user.email.toLowerCase()) {
        return true;
    }

    // Check if user email matches project PK (e.g. USER#email or HACK#id)
    if (project.PK && user.email) {
        if (project.PK.toLowerCase() === `user#${user.email.toLowerCase()}`) {
            return true;
        }
    }

    return false;
};

module.exports = {
    verifyToken,
    checkProjectOwnership
};
