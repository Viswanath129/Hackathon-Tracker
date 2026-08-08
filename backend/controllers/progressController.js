const { logProgress, getProgressLogs } = require("../services/progressService");
const dynamoService = require("../services/dynamoService");
const { validateProgressInput } = require("../utils/validation");

// @desc    Log a progress update for a project
// @route   POST /api/progress/update
// @access  Private
const logUpdate = async (req, res) => {
    try {
        const validationResult = validateProgressInput(req.body);
        if (!validationResult.isValid) {
            return res.status(400).json({ message: validationResult.error });
        }

        const { teamId, updateText, deltaPercentage } = req.body;

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // BOLA Check
        if (req.user.role !== "admin" && project.team_id !== req.user._id) {
            return res.status(403).json({ message: "Forbidden: You do not own this project" });
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        res.status(201).json(result);
    } catch (error) {
        console.error("Express logUpdate Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// @desc    Get progress logs for a project
// @route   GET /api/progress/:teamId
// @access  Private
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json({ message: "teamId parameter is required" });
        }

        const project = await dynamoService.getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // BOLA Check
        if (req.user.role !== "admin" && project.team_id !== req.user._id) {
            return res.status(403).json({ message: "Forbidden: You do not own this project" });
        }

        const logs = await getProgressLogs(teamId);
        res.status(200).json(logs);
    } catch (error) {
        console.error("Express getHistory Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
