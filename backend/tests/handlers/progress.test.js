const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();
const mockGetUser = jest.fn();
const mockGetHackathon = jest.fn();
const mockGetHackathonsByUser = jest.fn();
const mockGetProject = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args),
    getUser: (...args) => mockGetUser(...args),
    getHackathon: (...args) => mockGetHackathon(...args),
    getHackathonsByUser: (...args) => mockGetHackathonsByUser(...args),
    getProject: (...args) => mockGetProject(...args)
}));

const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Progress Handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    const createValidToken = (email = 'user@example.com') => {
        return jwt.sign({ email }, 'testsecret');
    };

    describe('logUpdate', () => {
        test('handles OPTIONS request with CORS headers', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(200);
            expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
        });

        test('returns 400 on missing request body', async () => {
            const event = { httpMethod: 'POST' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Missing JSON request body');
        });

        test('returns 400 on invalid JSON in body', async () => {
            const event = { httpMethod: 'POST', body: '{ invalid json ' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON request body');
        });

        test('returns 401 when token is missing or invalid', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Text', deltaPercentage: 10 }),
                headers: {}
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        test('returns 400 when input validation fails', async () => {
            const token = createValidToken('user@example.com');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com' });

            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Text', deltaPercentage: true }), // boolean invalid
                headers: { Authorization: `Bearer ${token}` }
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('deltaPercentage cannot be a boolean');
        });

        test('returns 403 when user does not own project', async () => {
            const token = createValidToken('user@example.com');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com', role: 'user' });
            mockGetProjectById.mockResolvedValue(null);
            mockGetHackathonsByUser.mockResolvedValue([]);

            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'other_proj', updateText: 'Text', deltaPercentage: 10 }),
                headers: { Authorization: `Bearer ${token}` }
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
        });

        test('returns 201 Created on successful progress update', async () => {
            const token = createValidToken('user@example.com');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com', role: 'user' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1', type: 'PROJECT' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T10:00:00.000Z' });

            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Built API endpoints', deltaPercentage: 25 }),
                headers: { Authorization: `Bearer ${token}` }
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body)).toEqual({ success: true, timestamp: '2026-03-01T10:00:00.000Z' });
        });

        test('returns 500 on internal service error without revealing stack trace', async () => {
            const token = createValidToken('user@example.com');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com', role: 'user' });
            mockGetProjectById.mockResolvedValue({ _id: 'user1', team_id: 'user1', type: 'PROJECT' });
            mockLogProgress.mockRejectedValue(new Error('Fatal DB failure'));

            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'user1', updateText: 'Text', deltaPercentage: 10 }),
                headers: { Authorization: `Bearer ${token}` }
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body)).toEqual({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory', () => {
        test('returns 400 when teamId path parameter is missing', async () => {
            const event = { httpMethod: 'GET', pathParameters: {} };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
        });

        test('returns 200 OK with logs when authorized', async () => {
            const token = createValidToken('user@example.com');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com', role: 'user' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', team_id: 'user1', type: 'PROJECT' });
            const mockLogs = [{ update_text: 'Log 1', delta_percentage: 20 }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'proj1' },
                headers: { Authorization: `Bearer ${token}` }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });
    });
});
