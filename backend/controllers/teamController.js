const dynamoService = require('../services/dynamoService');
const { logProgress, getProgressLogs } = require('../services/progressService');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3Client = require('../config/s3');

// @desc    Get team profile
const getTeamProfile = async (req, res) => {
    try {
        const user = await dynamoService.getUser(req.user.email);
        if (user) {
            const { password, PK, SK, ...userData } = user;
            res.json({ ...userData, loginEmail: req.user.loginEmail });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update team profile
const updateTeamProfile = async (req, res) => {
    try {
        const user = await dynamoService.getUser(req.user.email);
        if (user) {
            const updatedUser = {
                ...user,
                team_name: req.body.team_name || user.team_name,
                college: req.body.college || user.college,
                skills: req.body.skills || user.skills,
                members: req.body.members || user.members
            };
            await dynamoService.saveUser(updatedUser);

            await dynamoService.saveActivity({
                action: 'PROFILE_UPDATE',
                detail: `Updated team profile details`,
                email: req.user.email,
                team_name: updatedUser.team_name,
                icon: 'Settings'
            });

            const { password, PK, SK, ...cleanUser } = updatedUser;
            res.json(cleanUser);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new hackathon entry
const createHackathon = async (req, res) => {
    try {
        const { hackathon_name, start_date, end_date } = req.body;
        const hackathon = await dynamoService.saveHackathon(req.user.email, {
            hackathon_name,
            start_date,
            end_date,
            team_id: req.user._id
        });

        await dynamoService.saveActivity({
            action: 'HACKATHON_CREATE',
            detail: `Launched new hackathon: ${hackathon_name}`,
            email: req.user.email,
            team_name: req.user.team_name,
            icon: 'Calendar'
        });

        res.status(201).json(hackathon);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all hackathons for a team
const getHackathons = async (req, res) => {
    try {
        const hackathons = await dynamoService.getHackathonsByUser(req.user.email);
        res.json(hackathons);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a hackathon entry
const updateHackathon = async (req, res) => {
    try {
        const { hackathon_name, start_date, end_date } = req.body;
        const hackathon = await dynamoService.getHackathon(req.user.email, req.params.id);
        if (hackathon) {
            const updated = await dynamoService.saveHackathon(req.user.email, {
                ...hackathon,
                hackathon_name: hackathon_name || hackathon.hackathon_name,
                start_date: start_date || hackathon.start_date,
                end_date: end_date || hackathon.end_date
            });
            res.json(updated);
        } else {
            res.status(404).json({ message: 'Hackathon not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a hackathon entry
const deleteHackathon = async (req, res) => {
    try {
        const hackathon = await dynamoService.getHackathon(req.user.email, req.params.id);
        if (hackathon) {
            const projects = await dynamoService.getProjectsByHackathon(hackathon._id);
            for (const p of projects) {
                const reports = await dynamoService.getReportsByProject(p._id);
                for (const r of reports) {
                    await dynamoService.deleteReport(p._id, r._id);
                }
                await dynamoService.deleteProject(hackathon._id, p._id);
            }
            await dynamoService.deleteHackathon(req.user.email, req.params.id);
            res.json({ message: 'Hackathon removed' });
        } else {
            res.status(404).json({ message: 'Hackathon not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new project
const createProject = async (req, res) => {
    try {
        const { hackathon_id, project_title, description, status, progress_percentage } = req.body;
        const project = await dynamoService.saveProject(hackathon_id, {
            team_id: req.user._id,
            hackathon_id,
            project_title,
            description,
            status: status || 'Idea',
            progress_percentage: progress_percentage || 0,
            rating: 0,
            isRated: false
        });

        await dynamoService.saveActivity({
            action: 'PROJECT_CREATE',
            detail: `Initialized project: ${project_title}`,
            email: req.user.email,
            team_name: req.user.team_name,
            icon: 'Code2'
        });

        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all projects for a given hackathon
const getProjects = async (req, res) => {
    try {
        const projects = await dynamoService.getProjectsByHackathon(req.params.hackathonId);
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update project status/percentage/details
const updateProjectStatus = async (req, res) => {
    try {
        const { status, progress_percentage, project_title, description, hackathon_id } = req.body;
        const project = await dynamoService.getProject(hackathon_id, req.params.id);
        if (project) {
            const oldStatus = project.status;
            const oldProgress = project.progress_percentage;

            const updated = await dynamoService.saveProject(hackathon_id, {
                ...project,
                status: status || project.status,
                progress_percentage: progress_percentage !== undefined ? progress_percentage : project.progress_percentage,
                project_title: project_title || project.project_title,
                description: description || project.description
            });

            if (status !== oldStatus || progress_percentage !== oldProgress) {
                await logProgress(project._id, `Update: ${status || project.status} | ${progress_percentage || project.progress_percentage}%`, (progress_percentage || 0) - (oldProgress || 0));
            }

            res.json(updated);
        } else {
            res.status(404).json({ message: 'Project not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a project
const deleteProject = async (req, res) => {
    try {
        const { hackathon_id } = req.query;
        const project = await dynamoService.getProject(hackathon_id, req.params.id);
        if (project) {
            const reports = await dynamoService.getReportsByProject(project._id);
            for (const r of reports) {
                await dynamoService.deleteReport(project._id, r._id);
            }
            await dynamoService.deleteProject(hackathon_id, project._id);
            res.json({ message: 'Project removed' });
        } else {
            res.status(404).json({ message: 'Project not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upload project report to S3
const uploadReport = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const project_id = req.params.id; // From route /projects/:id/report
        const fileKey = `artifacts/${project_id}/${Date.now()}_${req.file.originalname}`;

        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        }));

        const report = await dynamoService.saveReport(project_id, {
            project_id,
            file_url: fileKey,
            original_name: req.file.originalname,
            rating: 0,
            feedback: ''
        });

        await dynamoService.saveActivity({
            action: 'ARTIFACT_UPLOAD',
            detail: `Deployed artifact: ${req.file.originalname}`,
            email: req.user.email,
            team_name: req.user.team_name,
            icon: 'UploadCloud'
        });

        res.status(201).json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all reports for a project
const getReports = async (req, res) => {
    try {
        const reports = await dynamoService.getReportsByProject(req.params.id);
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete an artifact
const deleteArtifact = async (req, res) => {
    try {
        const { project_id } = req.query;
        const reports = await dynamoService.getReportsByProject(project_id);
        const report = reports.find(r => r._id === req.params.id);

        if (report) {
            await s3Client.send(new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: report.file_url
            }));
            await dynamoService.deleteReport(project_id, req.params.id);
            res.json({ message: 'Artifact deleted' });
        } else {
            res.status(404).json({ message: 'Artifact not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Report an issue
const reportIssue = async (req, res) => {
    try {
        const { title, description, project_id } = req.body;
        let image_url = '';

        if (req.file) {
            const fileKey = `issues/${req.user._id}/${Date.now()}_${req.file.originalname}`;
            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: fileKey,
                Body: req.file.buffer,
                ContentType: req.file.mimetype
            }));
            image_url = fileKey;
        }

        const issue = await dynamoService.saveIssue(req.user.email, {
            team_id: req.user._id,
            project_id,
            title,
            description,
            image_url,
            status: 'Open',
            user_id: req.user._id
        });

        await dynamoService.saveActivity({
            action: 'ISSUE_REPORT',
            detail: `Reported issue: ${title}`,
            email: req.user.email,
            team_name: req.user.team_name,
            icon: 'AlertTriangle'
        });

        res.status(201).json(issue);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTeamIssues = async (req, res) => {
    try {
        const issues = await dynamoService.getIssuesByUser(req.user.email);
        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getProjectHistory = async (req, res) => {
    try {
        const logs = await getProgressLogs(req.params.id);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get signed URL for artifact download
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

// @desc    Get leaderboard data sorted by rating
const getLeaderboard = async (req, res) => {
    try {
        const allProjects = await dynamoService.getAllProjects();
        const allUsers = await dynamoService.getAllUsers();
        const allHacks = await dynamoService.getAllHackathons();

        const populated = allProjects.map(p => ({
            ...p,
            team_id: allUsers.find(u => u._id === p.team_id) || { team_name: 'Unknown', college: 'N/A' },
            hackathon_id: allHacks.find(h => h._id === p.hackathon_id) || { hackathon_name: 'N/A' }
        })).sort((a, b) => (b.rating || 0) - (a.rating || 0));

        res.json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Leaderboard Fetch Error' });
    }
};

const getActivities = async (req, res) => {
    try {
        const activities = await dynamoService.getActivitiesByUser(req.user.email, 15);
        res.json(activities);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch activity logs' });
    }
};

module.exports = {
    getTeamProfile, updateTeamProfile, createHackathon, getHackathons,
    updateHackathon, deleteHackathon, createProject, getProjects,
    updateProjectStatus, deleteProject, uploadReport, getReports,
    deleteArtifact, reportIssue, getTeamIssues, getProjectHistory,
    getSignedDownloadUrl, getLeaderboard, getActivities
};
