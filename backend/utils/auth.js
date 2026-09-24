/**
 * Verifies if a user has ownership/authorization for a specific project.
 * Enforces strict equality checks against user identifiers to prevent BOLA vulnerabilities.
 *
 * @param {Object} user - Decoded JWT payload or req.user object
 * @param {Object} project - DynamoDB project record
 * @returns {boolean} - true if authorized, false otherwise
 */
function checkProjectOwnership(user, project) {
    if (!user || !project) {
        return false;
    }

    // Admin role override
    if (user.role === 'admin') {
        return true;
    }

    const userIds = [user._id, user.teamId, user.id].filter(Boolean);
    const userEmails = [user.email, user.loginEmail].filter(Boolean).map(e => e.toLowerCase());

    const projectIds = [project._id, project.teamId, project.userId, project.id].filter(Boolean);
    const projectEmails = [project.teamEmail, project.email, project.userId].filter(Boolean).map(e => String(e).toLowerCase());

    // Extract PK if formatted as USER#<email> or HACK#<id>
    if (project.PK && typeof project.PK === 'string') {
        if (project.PK.startsWith('USER#')) {
            projectEmails.push(project.PK.substring(5).toLowerCase());
        }
    }

    // Strict equality check for IDs
    for (const uid of userIds) {
        for (const pid of projectIds) {
            if (String(uid) === String(pid)) {
                return true;
            }
        }
    }

    // Strict equality check for Emails
    for (const uemail of userEmails) {
        for (const pemail of projectEmails) {
            if (uemail === pemail) {
                return true;
            }
        }
    }

    return false;
}

module.exports = {
    checkProjectOwnership
};
