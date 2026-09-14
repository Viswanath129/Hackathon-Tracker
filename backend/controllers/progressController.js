const { logProgress, getProgressLogs } = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logProgressUpdate = async (req, res) => {
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

        const isAuthorized = checkProjectOwnership(req.user, project);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not own this project' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({ message: 'Progress logged successfully', result });
    } catch (error) {
        console.error("Error in logProgressUpdate controller:", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getProgressHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId path parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isAuthorized = checkProjectOwnership(req.user, project);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not own this project' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json({ logs });
    } catch (error) {
        console.error("Error in getProgressHistory controller:", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logProgressUpdate, getProgressHistory };
