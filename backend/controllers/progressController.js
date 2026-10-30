const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.error });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project)) {
            return res.status(403).json({ message: 'Forbidden: You do not own this project' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);

        await dynamoService.saveActivity({
            action: 'PROGRESS_UPDATE',
            detail: `Logged progress update: ${updateText}`,
            email: req.user.email,
            team_name: req.user.team_name,
            icon: 'Activity'
        });

        res.status(201).json({
            message: 'Progress update logged successfully',
            timestamp: result.timestamp
        });
    } catch (error) {
        console.error('Express Log Update Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project)) {
            return res.status(403).json({ message: 'Forbidden: You do not own this project' });
        }

        const logs = await getProgressLogs(teamId);
        res.status(200).json(logs);
    } catch (error) {
        console.error('Express Get History Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
