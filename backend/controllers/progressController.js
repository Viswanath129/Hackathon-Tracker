const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');

const logUpdate = async (req, res) => {
    try {
        const { valid, message } = validateProgressInput(req.body);
        if (!valid) {
            return res.status(400).json({ message });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        // BOLA check
        const projects = await dynamoService.getAllProjects();
        const project = projects.find(p => p._id === teamId);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check ownership
        if (req.user.role !== 'admin' && project.team_id !== req.user._id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this project' });
        }

        // Log progress
        const result = await logProgress(teamId, updateText, Number(deltaPercentage));

        return res.status(201).json({ success: true, timestamp: result.timestamp });
    } catch (error) {
        console.error("Express logUpdate Error:", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;

        if (!teamId || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        // BOLA check
        const projects = await dynamoService.getAllProjects();
        const project = projects.find(p => p._id === teamId);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check ownership
        if (req.user.role !== 'admin' && project.team_id !== req.user._id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this project' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs || []);
    } catch (error) {
        console.error("Express getHistory Error:", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logUpdate, getHistory };
