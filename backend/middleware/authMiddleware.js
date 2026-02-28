const jwt = require('jsonwebtoken');
const dynamoService = require('../services/dynamoService');

const protect = async (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch from Cloud (DynamoDB)
        let user = await dynamoService.getUser(decoded.email);

        // If not found directly, check if it is a team member login
        if (!user) {
            const allUsers = await dynamoService.getAllUsers();
            user = allUsers.find(t => t.members && t.members.some(m => m.email === decoded.email));
        }

        if (!user) {
            return res.status(401).json({ message: 'User not found in cloud' });
        }

        const { password, ...cleanUser } = user;
        // Add the actual login email to the user object so the frontend knows who is logged in
        req.user = { ...cleanUser, loginEmail: decoded.email };
        next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
};

module.exports = { protect, admin };

