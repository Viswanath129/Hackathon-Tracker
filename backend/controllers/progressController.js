const dynamoService = require('../services/dynamoService');
const progressService = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logUpdate = async (req, res) => {
    const validation = validateProgressInput(req.body);
    if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
    }

    const { teamId, updateText, deltaPercentage } = validation.value;

    try {
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project)) {
            return res.status(403).json({ message: 'Forbidden: Access denied for this project' });
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (err) {
        console.error('Express Error logging progress update:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getHistory = async (req, res) => {
    const { teamId } = req.params;
    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
        return res.status(400).json({ message: 'teamId parameter is required' });
    }

    try {
        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (!checkProjectOwnership(req.user, project)) {
            return res.status(403).json({ message: 'Forbidden: Access denied for this project' });
        }

        const logs = await progressService.getProgressLogs(teamId);
        return res.status(200).json({
            teamId,
            logs
        });
    } catch (err) {
        console.error('Express Error retrieving progress history:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
