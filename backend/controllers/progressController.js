const { logProgress, getProgressLogs } = require('../services/progressService');
const { validateProgressInput } = require('../utils/validation');
const { checkProjectOwnership } = require('../utils/auth');

const logProgressUpdate = async (req, res) => {
    const validation = validateProgressInput(req.body);
    if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
    }

    if (!checkProjectOwnership(req.user, req.body.teamId)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission for this project' });
    }

    console.log('Express: Logging progress update for teamId:', req.body.teamId);

    try {
        const result = await logProgress(req.body.teamId, req.body.updateText, Number(req.body.deltaPercentage));
        return res.status(201).json({
            message: 'Progress update logged successfully',
            data: result
        });
    } catch (err) {
        console.error('Express Progress Log Update Error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getProgressHistory = async (req, res) => {
    const { teamId } = req.params;

    if (!teamId) {
        return res.status(400).json({ error: 'teamId parameter is required' });
    }

    if (!checkProjectOwnership(req.user, teamId)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission for this project' });
    }

    console.log('Express: Fetching progress history for teamId:', teamId);

    try {
        const logs = await getProgressLogs(teamId);
        return res.status(200).json({
            success: true,
            data: logs
        });
    } catch (err) {
        console.error('Express Get Progress History Error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { logProgressUpdate, getProgressHistory };
