const { logProgress, getProgressLogs, getProjectById } = require("../services/progressService");
const { validateProgressInput } = require("../utils/validation");
const { checkProjectOwnership } = require("../utils/auth");

const logUpdate = async (req, res) => {
    const validation = validateProgressInput(req.body);
    if (!validation.isValid) {
        return res.status(400).json({ message: validation.error });
    }

    const { teamId, updateText, deltaPercentage } = req.body;

    try {
        const project = await getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const isOwner = checkProjectOwnership(req.user, project);
        if (!isOwner) {
            return res.status(403).json({ message: "Forbidden: You do not have permission to update this project" });
        }

        const result = await logProgress(teamId, updateText, Number(deltaPercentage));
        return res.status(201).json({ message: "Progress logged successfully", data: result });
    } catch (error) {
        console.error("Express logUpdate error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const getHistory = async (req, res) => {
    const { teamId } = req.params;

    if (!teamId || teamId.trim() === "") {
        return res.status(400).json({ message: "teamId parameter is required" });
    }

    try {
        const project = await getProjectById(teamId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const isOwner = checkProjectOwnership(req.user, project);
        if (!isOwner) {
            return res.status(403).json({ message: "Forbidden: You do not have permission to view progress for this project" });
        }

        const logs = await getProgressLogs(teamId);
        return res.status(200).json({ success: true, data: logs });
    } catch (error) {
        console.error("Express getHistory error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = { logUpdate, getHistory };
