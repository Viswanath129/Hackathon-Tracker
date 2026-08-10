const { logProgress, getProgressLogs } = require("../services/progressService");
const dynamoService = require("../services/dynamoService");
const { validateProgressInput } = require("../utils/validation");

/**
 * Controller to log progress update.
 * Route: POST /api/progress/update
 */
const logUpdate = async (req, res) => {
    try {
        const validation = validateProgressInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        // BOLA / IDOR Authorization check
        if (req.user && req.user.role !== "admin") {
            const allProjects = await dynamoService.getAllProjects();
            const project = allProjects.find(p => p._id === teamId);
            if (!project || project.team_id !== req.user._id) {
                return res.status(403).json({ message: "Forbidden: You are not authorized for this project" });
            }
        }

        await logProgress(teamId, updateText, deltaPercentage);

        return res.status(201).json({ message: "Progress logged successfully" });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * Controller to retrieve progress history for a team.
 * Route: GET /api/progress/:teamId
 */
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: "teamId parameter is required" });
        }

        // BOLA / IDOR Authorization check
        if (req.user && req.user.role !== "admin") {
            const allProjects = await dynamoService.getAllProjects();
            const project = allProjects.find(p => p._id === teamId);
            if (!project || project.team_id !== req.user._id) {
                return res.status(403).json({ message: "Forbidden: You are not authorized for this project" });
            }
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json(logs);
    } catch (error) {
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
