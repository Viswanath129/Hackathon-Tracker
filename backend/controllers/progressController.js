const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Controller to log a progress update via Express route (POST /api/progress/update)
 */
const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (req.user && !checkProjectOwnership(req.user, project)) {
            return res.status(403).json({ message: 'Forbidden: You do not own this project' });
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);

        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Express Log Progress Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Controller to retrieve progress history via Express route (GET /api/progress/:teamId)
 */
const getHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId || req.params.id;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (req.user && !checkProjectOwnership(req.user, project)) {
            return res.status(403).json({ message: 'Forbidden: You do not own this project' });
        }

        const history = await progressService.getProgressLogs(teamId);

        return res.status(200).json({
            message: 'Progress history retrieved successfully',
            data: history || []
        });
    } catch (error) {
        console.error('Express Get Progress History Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
