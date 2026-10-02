const progressService = require('../services/progressService');
const dynamoService = require('../services/dynamoService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

/**
 * Log progress update for a team project.
 */
const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isOwner = checkProjectOwnership(req.user, project);
        if (!isOwner) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to update this project' });
        }

        const result = await progressService.logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({ message: 'Progress update logged successfully', result });
    } catch (error) {
        console.error('Error in logProgressUpdate:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * Get progress logs history for a team project.
 */
const getProgressHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId || typeof teamId !== 'string' || teamId.trim() === '') {
            return res.status(400).json({ message: 'teamId path parameter is required' });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const isOwner = checkProjectOwnership(req.user, project);
        if (!isOwner) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to view progress history for this project' });
        }

        const logs = await progressService.getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error('Error in getProgressHistory:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    logProgressUpdate,
    getProgressHistory
};
