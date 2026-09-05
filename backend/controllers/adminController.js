const dynamoService = require('../services/dynamoService');
const { ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3Client = require('../config/s3');

/**
 * @desc Get global analytics
 */
const getAnalytics = async (req, res) => {
    try {
        const users = await dynamoService.getAllUsers();
        const teams = users.filter(u => u.role === 'team');
        const hackathons = await dynamoService.getAllHackathons();
        const projects = await dynamoService.getAllProjects();

        const completed = projects.filter(p => p.status === 'Completed').length;
        const active = projects.filter(p => p.status !== 'Completed' && p.status !== 'Idea').length;

        const statusCounts = projects.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {});
        const projectStatusDistribution = Object.entries(statusCounts).map(([id, count]) => ({ _id: id, count }));

        const teamAverageProgress = teams.map(t => {
            const teamProjs = projects.filter(p => p.team_id === t._id);
            const avg = teamProjs.length > 0 ? (teamProjs.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / teamProjs.length) : 0;
            return { team_name: t.team_name, avg_progress: Math.round(avg) };
        });

        const hackathonParticipation = hackathons.map(h => {
            const count = projects.filter(p => p.hackathon_id === h._id).length;
            return { name: h.hackathon_name, value: count };
        });

        res.json({
            overview: {
                totalTeams: teams.length,
                totalHackathons: hackathons.length,
                activeProjects: active,
                completedProjects: completed
            },
            projectStatusDistribution,
            teamAverageProgress,
            hackathonParticipation
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc Get all teams list
 */
const getTeams = async (req, res) => {
    try {
        const users = await dynamoService.getAllUsers();
        const teams = users.filter(u => u.role === 'team');
        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc Get detailed team profile
 */
const getTeamById = async (req, res) => {
    try {
        const users = await dynamoService.getAllUsers();
        const team = users.find(u => u._id === req.params.id);

        if (team) {
            const hackathons = await dynamoService.getHackathonsByUser(team.email);
            const projects = await dynamoService.getAllProjects();
            const teamProjects = projects.filter(p => p.team_id === team._id);
            const activities = await dynamoService.getActivitiesByUser(team.email, 20);
            const issues = await dynamoService.getIssuesByUser(team.email);

            const populatedProjects = await Promise.all(teamProjects.map(async p => {
                const reports = await dynamoService.getReportsByProject(p._id);
                return { ...p, reports };
            }));

            res.json({ ...team, hackathons, projects: populatedProjects, activities: activities || [], issues: issues || [] });
        } else {
            res.status(404).json({ message: 'Team not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc Delete a team from cloud
 */
const deleteTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const users = await dynamoService.getAllUsers();
        const team = users.find(u => u._id === id);

        if (!team) return res.status(404).json({ message: 'Team not found' });

        // Cascade: delete all hackathons → projects → reports → issues
        const hackathons = await dynamoService.getHackathonsByUser(team.email);
        for (const h of hackathons) {
            const projects = await dynamoService.getProjectsByHackathon(h._id);
            for (const p of projects) {
                const reports = await dynamoService.getReportsByProject(p._id);
                for (const r of reports) {
                    // Also delete from S3
                    try {
                        await s3Client.send(new DeleteObjectCommand({
                            Bucket: process.env.AWS_S3_BUCKET,
                            Key: r.file_url
                        }));
                    } catch (s3Err) {
                        console.error('S3 delete error during team cleanup:', s3Err.message);
                    }
                    await dynamoService.deleteReport(p._id, r._id);
                }
                await dynamoService.deleteProject(h._id, p._id);
            }
            await dynamoService.deleteHackathon(team.email, h._id);
        }

        // Delete the user metadata record
        await dynamoService.deleteUser(team.email);
        res.json({ message: 'Team and all associated data removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc Update artifact grading
 */
const gradeReport = async (req, res) => {
    try {
        const { rating, feedback, project_id } = req.body;
        const reports = await dynamoService.getReportsByProject(project_id);
        const report = reports.find(r => r._id === req.params.id);

        if (report) {
            const updated = await dynamoService.saveReport(project_id, {
                ...report,
                rating,
                feedback
            });
            res.json(updated);
        } else {
            res.status(404).json({ message: 'Report not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc Delete team artifact (Admin)
 */
const deleteReport = async (req, res) => {
    try {
        const { project_id } = req.query;
        if (!project_id) {
            return res.status(400).json({ message: 'project_id query param is required' });
        }
        const reports = await dynamoService.getReportsByProject(project_id);
        const report = reports.find(r => r._id === req.params.id);

        if (report) {
            await s3Client.send(new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: report.file_url
            }));
            await dynamoService.deleteReport(project_id, req.params.id);
            res.json({ message: 'Artifact deleted from cloud' });
        } else {
            res.status(404).json({ message: 'Artifact not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc List all files in team artifacts bucket
 */
const listS3Files = async (req, res) => {
    try {
        const command = new ListObjectsV2Command({
            Bucket: process.env.AWS_S3_BUCKET,
            Prefix: 'artifacts/'
        });
        const { Contents } = await s3Client.send(command);
        res.json(Contents || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc Explicitly rate a project
 */
const rateProject = async (req, res) => {
    try {
        const { rating, hackathon_id } = req.body;
        const project = await dynamoService.getProject(hackathon_id, req.params.id);

        if (project) {
            const updated = await dynamoService.saveProject(hackathon_id, {
                ...project,
                rating,
                isRated: true
            });
            res.json(updated);
        } else {
            res.status(404).json({ message: 'Project not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const getSignedDownloadUrl = async (req, res) => {
    try {
        const { project_id } = req.query;
        if (!project_id) {
            return res.status(400).json({ message: 'project_id query param is required' });
        }
        // Look up the real S3 key from the report record
        const reports = await dynamoService.getReportsByProject(project_id);
        const report = reports.find(r => r._id === req.params.id);
        if (!report) return res.status(404).json({ message: 'Report not found' });

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: report.file_url,  // Correct: use the stored S3 file key
        });
        const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        res.json({ downloadUrl });  // Frontend expects 'downloadUrl'
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getActivities = async (req, res) => {
    try {
        const activities = await dynamoService.getGlobalActivity(50);
        res.json(activities);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch global logs' });
    }
};

module.exports = { getAnalytics, getTeams, getTeamById, deleteTeam, gradeReport, deleteReport, listS3Files, rateProject, getSignedDownloadUrl, getActivities };
