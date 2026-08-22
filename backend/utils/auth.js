const dynamoService = require('../services/dynamoService');

const checkProjectOwnership = async (user, teamId) => {
    if (!user) return false;
    if (user.role === 'admin') {
        return true;
    }

    if (user._id === teamId || user.id === teamId) {
        return true;
    }

    const project = await dynamoService.getProjectById(teamId);
    if (project) {
        if (project.team_id && (project.team_id === user._id || project.team_id === user.id)) {
            return true;
        }
        if (project.hackathon_id) {
            const hackathon = await dynamoService.getHackathon(user.email, project.hackathon_id);
            if (hackathon) {
                return true;
            }
        }
        return false;
    }

    const hackathons = await dynamoService.getHackathonsByUser(user.email);
    if (hackathons && hackathons.length > 0) {
        for (const h of hackathons) {
            const p = await dynamoService.getProject(h._id, teamId);
            if (p) return true;
        }
    }

    return false;
};

module.exports = { checkProjectOwnership };
