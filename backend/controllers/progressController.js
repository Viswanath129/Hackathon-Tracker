const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logProgressUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const authCheck = await checkProjectOwnership(req.user, teamId);
        if (authCheck.notFound) {
            return res.status(404).json({ message: 'Project not found' });
        }
        if (!authCheck.authorized) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const result = await logProgress(teamId, updateText, deltaPercentage);
        return res.status(201).json({ message: 'Progress logged successfully', data: result });
    } catch (error) {
        console.error('Error logging progress update:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getProgressHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: 'teamId parameter is required' });
        }

        const authCheck = await checkProjectOwnership(req.user, teamId);
        if (authCheck.notFound) {
            return res.status(404).json({ message: 'Project not found' });
        }
        if (!authCheck.authorized) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json({ message: 'Progress history retrieved', data: logs });
    } catch (error) {
        console.error('Error fetching progress history:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { logProgressUpdate, getProgressHistory };
