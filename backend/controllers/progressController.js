const { validateProgressInput } = require('../utils/validation');
const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');

/**
 * Express controller for logging progress update
 * POST /api/progress/update
 */
const logProgressUpdate = async (req, res) => {
    try {
        const { teamId, updateText, deltaPercentage } = req.body || {};

        const validation = validateProgressInput(teamId, updateText, deltaPercentage);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // BOLA Verification
        const userEmail = (user.loginEmail || user.email || '').toLowerCase();
        let hasAccess = user.role === 'admin' || (userEmail && teamId.toLowerCase() === userEmail);

        if (!hasAccess && userEmail) {
            try {
                const project = await dynamoService.getProjectById(teamId);
                if (project) {
                    if ((project.email && project.email.toLowerCase() === userEmail) ||
                        (project.userEmail && project.userEmail.toLowerCase() === userEmail) ||
                        (project.createdBy && project.createdBy.toLowerCase() === userEmail) ||
                        (project.PK && project.PK.toLowerCase() === `user#${userEmail}`)) {
                        hasAccess = true;
                    } else if (project.PK && project.PK.startsWith('HACK#')) {
                        const hackId = project.PK.split('HACK#')[1];
                        const hackathon = await dynamoService.getHackathon(userEmail, hackId);
                        if (hackathon) hasAccess = true;
                    }
                }
            } catch (err) {
                console.error('Error during Express BOLA check:', err);
            }
        }

        if (!hasAccess) {
            return res.status(403).json({ message: 'Forbidden: Access denied to project or team' });
        }

        const result = await progressService.logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in logProgressUpdate controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Express controller for getting progress history
 * GET /api/progress/:teamId
 */
const getProgressHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // BOLA Verification
        const userEmail = (user.loginEmail || user.email || '').toLowerCase();
        let hasAccess = user.role === 'admin' || (userEmail && teamId.toLowerCase() === userEmail);

        if (!hasAccess && userEmail) {
            try {
                const project = await dynamoService.getProjectById(teamId);
                if (project) {
                    if ((project.email && project.email.toLowerCase() === userEmail) ||
                        (project.userEmail && project.userEmail.toLowerCase() === userEmail) ||
                        (project.createdBy && project.createdBy.toLowerCase() === userEmail) ||
                        (project.PK && project.PK.toLowerCase() === `user#${userEmail}`)) {
                        hasAccess = true;
                    } else if (project.PK && project.PK.startsWith('HACK#')) {
                        const hackId = project.PK.split('HACK#')[1];
                        const hackathon = await dynamoService.getHackathon(userEmail, hackId);
                        if (hackathon) hasAccess = true;
                    }
                }
            } catch (err) {
                console.error('Error during Express BOLA check:', err);
            }
        }

        if (!hasAccess) {
            return res.status(403).json({ message: 'Forbidden: Access denied to project or team' });
        }

        const logs = await progressService.getProgressLogs(teamId);
        return res.status(200).json({
            message: 'Progress history retrieved',
            data: logs || []
        });
    } catch (error) {
        console.error('Error in getProgressHistory controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logProgressUpdate,
    getProgressHistory
};
