const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dynamoService = require('../services/dynamoService');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = require('../config/s3');

const saveToS3 = async (team_name, data, filename) => {
    const bucketName = process.env.AWS_S3_BUCKET;
    const sanitizedTeamName = team_name.replace(/[^a-zA-Z0-9-]/g, '_');
    const fileKey = `auth_logs/${sanitizedTeamName}/${filename}.json`;
    const uploadParams = {
        Bucket: bucketName,
        Key: fileKey,
        Body: JSON.stringify(data, null, 2),
        ContentType: 'application/json',
    };
    try {
        await s3Client.send(new PutObjectCommand(uploadParams));
    } catch (e) {
        console.error("Failed to save to S3", e);
    }
};

const generateToken = (id, email) => {
    return jwt.sign({ id, email }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

const registerUser = async (req, res) => {
    try {
        const { team_name, email, password, role, college, skills } = req.body;

        if (!team_name || !email || !password) {
            return res.status(400).json({ message: 'team_name, email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const userExists = await dynamoService.getUser(email);

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        if (role === 'admin') {
            const allUsers = await dynamoService.getAllUsers();
            const adminCount = allUsers.filter(u => u.role === 'admin').length;
            if (adminCount >= 5) {
                return res.status(400).json({ message: 'Admin limit reached (Max 5)' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await dynamoService.saveUser({
            team_name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role || 'team',
            college,
            skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []),
            members: []
        });

        const userData = {
            _id: user._id,
            team_name: user.team_name,
            email: user.email,
            role: user.role,
            college: user.college,
            skills: user.skills,
            timestamp: new Date().toISOString()
        };

        // Save registration data to S3
        await saveToS3(user.team_name, userData, 'registration_details');

        // Log Global Activity
        await dynamoService.saveActivity({
            action: 'USER_REGISTER',
            detail: `${user.team_name} registered as ${user.role}`,
            email: user.email,
            team_name: user.team_name,
            icon: 'UserPlus'
        });

        res.status(201).json({
            ...userData,
            token: generateToken(user._id, user.email),
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

const authUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await dynamoService.getUser(email);

        // Check if member email exists in any team
        if (!user) {
            const allTeams = await dynamoService.getAllUsers();
            user = allTeams.find(t => t.members && t.members.some(m => m.email === email));
        }

        if (user && (await bcrypt.compare(password, user.password))) {
            const loginData = {
                _id: user._id,
                team_name: user.team_name,
                email: email, // Use the login email (might be a member email)
                role: user.role,
                login_timestamp: new Date().toISOString()
            };

            // Save login data to S3
            await saveToS3(user.team_name, loginData, `login_${Date.now()}`);

            // Log Global Activity
            await dynamoService.saveActivity({
                action: 'USER_LOGIN',
                detail: `${email} logged in`,
                email: user.email,
                team_name: user.team_name,
                icon: 'LogIn'
            });

            res.json({
                ...loginData,
                token: generateToken(user._id, email),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

module.exports = { registerUser, authUser };
