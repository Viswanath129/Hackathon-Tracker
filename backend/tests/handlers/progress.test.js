const jwt = require('jsonwebtoken');

// Mock dependencies
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetUser = jest.fn();
const mockGetAllUsers = jest.fn();
const mockGetAllProjects = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../services/dynamoService', () => ({
    getUser: mockGetUser,
    getAllUsers: mockGetAllUsers,
    getAllProjects: mockGetAllProjects
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Lambda Handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate', () => {
        it('should return 200 for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(200);
            expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
        });

        it('should return 400 when event body is missing', async () => {
            const event = { httpMethod: 'POST', body: null };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Request body is required' });
        });

        it('should return 400 when event body is invalid JSON', async () => {
            const event = { httpMethod: 'POST', body: 'invalid-json' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Invalid JSON body' });
        });

        it('should return 400 when input validation fails (missing updateText)', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'team123', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Validation failed');
            expect(body.errors).toContain('updateText must be a non-empty string');
        });

        it('should return 400 when deltaPercentage is a boolean', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'team123', updateText: 'Updated auth', deltaPercentage: true })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Validation failed');
            expect(body.errors).toContain('deltaPercentage must be a valid numeric value');
        });

        it('should return 401 when user is not authenticated', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'team123', updateText: 'Updated auth', deltaPercentage: 15 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({ message: 'Unauthorized' });
        });

        it('should return 403 when user is forbidden (BOLA check fails)', async () => {
            const token = jwt.sign({ email: 'other@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'other@example.com', role: 'user' });
            mockGetAllProjects.mockResolvedValue([{ _id: 'team123', userEmail: 'owner@example.com' }]);

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Updated auth', deltaPercentage: 15 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body)).toEqual({ message: 'Forbidden: Access denied to project' });
        });

        it('should return 201 Created on successful log update', async () => {
            const token = jwt.sign({ email: 'owner@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'owner@example.com', role: 'user' });
            mockGetAllProjects.mockResolvedValue([{ _id: 'team123', userEmail: 'owner@example.com' }]);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Updated auth', deltaPercentage: 15 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(body.data).toEqual({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });
        });

        it('should return 500 Internal Server Error when service throws an error', async () => {
            const token = jwt.sign({ email: 'owner@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'owner@example.com', role: 'user' });
            mockGetAllProjects.mockResolvedValue([{ _id: 'team123', userEmail: 'owner@example.com' }]);
            mockLogProgress.mockRejectedValue(new Error('DynamoDB failure'));

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'team123', updateText: 'Updated auth', deltaPercentage: 15 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body)).toEqual({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        it('should return 400 if teamId path parameter is missing', async () => {
            const event = { httpMethod: 'GET', pathParameters: null };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'teamId path parameter is required' });
        });

        it('should return 200 OK with progress history when authorized', async () => {
            const token = jwt.sign({ email: 'owner@example.com' }, 'testsecret');
            mockGetUser.mockResolvedValue({ email: 'owner@example.com', role: 'user' });
            mockGetAllProjects.mockResolvedValue([{ _id: 'team123', userEmail: 'owner@example.com' }]);
            mockGetProgressLogs.mockResolvedValue([
                { update_text: 'Initial log', delta_percentage: 20 }
            ]);

            const event = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'team123' },
                headers: { Authorization: `Bearer ${token}` }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.teamId).toBe('team123');
            expect(body.logs.length).toBe(1);
        });
    });
});
