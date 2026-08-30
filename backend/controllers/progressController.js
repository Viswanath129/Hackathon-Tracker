const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText } = req.body;

        const isAuthorized = await checkProjectOwnership(teamId, req.user);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access denied for this project' });
        }

        const result = await logProgress(teamId, updateText, validation.numDelta);
        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (error) {
        console.error('Express logProgressUpdate error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getProgressHistory = async (req, res) => {
    try {
        const teamId = req.params.teamId || req.params.id;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const isAuthorized = await checkProjectOwnership(teamId, req.user);
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: Access denied for this project' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        console.error('Express getProgressHistory error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logProgressUpdate, getProgressHistory };
