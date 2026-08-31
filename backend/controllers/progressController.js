const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Controller to handle logging a progress update.
 * POST /api/progress/update
 */
const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.error });
        }

        if (req.user) {
            const isAuthorized = await checkProjectOwnership(req.user, validation.projectId);
            if (!isAuthorized) {
                return res.status(403).json({ message: 'Forbidden: Access denied for this project resource' });
            }
        }

        console.log(`Express Controller: Logging progress for teamId/projectId: ${validation.projectId}`);

        const result = await logProgress(
            validation.projectId,
            validation.updateText,
            validation.deltaPercentage
        );

        return res.status(201).json({
            message: 'Progress log recorded successfully',
            data: result
        });
    } catch (error) {
        console.error('Express Progress Update Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Controller to fetch progress history for a team or project.
 * GET /api/progress/:teamId
 */
const getProgressHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId || req.params.id;

        if (!teamId || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId path parameter is required' });
        }

        if (req.user) {
            const isAuthorized = await checkProjectOwnership(req.user, teamId);
            if (!isAuthorized) {
                return res.status(403).json({ message: 'Forbidden: Access denied for this project resource' });
            }
        }

        console.log(`Express Controller: Fetching progress logs for teamId/projectId: ${teamId}`);

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error('Express Progress History Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logProgressUpdate,
    getProgressHistory
};
