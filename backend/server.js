const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const cors = require('cors');
// Cloud-Only mode enabled (AWS DynamoDB)
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const adminRoutes = require('./routes/adminRoutes');
const progressRoutes = require('./routes/progressRoutes');
console.log('AWS Cloud persistence active.');

const app = express();

// CORS: Support multiple origins via comma-separated CORS_ORIGIN env var
// Example: CORS_ORIGIN=http://localhost:5173,http://<EC2_PUBLIC_IP>:5173,http://<EC2_PUBLIC_IP>
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim());

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Serve static files for PDF reports
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/progress', progressRoutes);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => console.log(`Server running in ${process.env.NODE_ENV} mode on ${HOST}:${PORT}`));
