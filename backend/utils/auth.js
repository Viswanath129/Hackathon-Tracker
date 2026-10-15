/**
 * Authorization utility for checking project ownership.
 * Performs strict equality checks against user identifiers (e.g. teamId, _id, email)
 * to prevent Broken Object Level Authorization (BOLA) vulnerabilities.
 */
const checkProjectOwnership = (user, project) => {
    if (!user || !project) {
        return false;
    }

    if (user.role === 'admin') {
        return true;
    }

    const userIdentifiers = [
        user.teamId,
        user._id,
        user.id,
        user.email,
        user.loginEmail,
        user.sub
    ].filter(id => id !== undefined && id !== null && String(id).trim().length > 0)
     .map(id => String(id));

    const projectIdentifiers = [
        project.teamId,
        project.owner,
        project.userId,
        project.userEmail,
        project.email,
        project._id,
        project.id
    ].filter(id => id !== undefined && id !== null && String(id).trim().length > 0)
     .map(id => String(id));

    // Also check if PK/SK in DynamoDB matches USER#<email> or PROJ#<id>
    if (project.PK && project.PK.startsWith('USER#')) {
        projectIdentifiers.push(project.PK.replace('USER#', ''));
    }

    for (const userId of userIdentifiers) {
        for (const projId of projectIdentifiers) {
            if (userId === projId) {
                return true;
            }
        }
    }

    return false;
};

module.exports = { checkProjectOwnership };
