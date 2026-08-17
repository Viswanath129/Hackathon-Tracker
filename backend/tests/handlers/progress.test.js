const jwt = require('jsonwebtoken');

// Mock dependencies before requiring handlers
jest.mock('../../services/progressService', () => ({
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
}));

jest.mock('../../services/dynamoService', () => ({
    getUser: jest.fn(),
    getAllProjects: jest.fn(),
    getAllUsers: jest.fn()
}));

const { logProgress, getProgressLogs } = require('../../services/progressService');
const dynamoService = require('../../services/dynamoService');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Serverless Progress Lambda Handlers', () => {
    const JWT_SECRET = 'test_jwt_secret';

    beforeEach(() => {
        process.env.JWT_SECRET = JWT_SECRET;
        process.env.CORS_ORIGIN = 'http://localhost:5173';
        jest.clearAllMocks();
    });

    describe('logUpdate', () => {
        test('returns 400 Bad Request if body is missing', async () => {
            const event = {};
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/Missing request body/);
        });

        test('returns 400 Bad Request if body JSON is invalid', async () => {
            const event = { body: 'invalid-json' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/Invalid JSON body/);
        });

        test('returns 401 Unauthorized if auth header is missing', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Update', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        test('returns 400 Bad Request if validation fails', async () => {
            const token = jwt.sign({ email: 'user@test.com', role: 'user' }, JWT_SECRET);
            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: '', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/updateText is required/);
        });

        test('returns 403 Forbidden if user is BOLA unauthorized', async () => {
            const token = jwt.sign({ email: 'other@test.com', role: 'user', _id: 'user_other' }, JWT_SECRET);
            dynamoService.getUser.mockResolvedValue(null);
            dynamoService.getAllProjects.mockResolvedValue([]);

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Progressing', deltaPercentage: 20 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toMatch(/Forbidden/);
        });

        test('returns 201 Created on successful log update for admin', async () => {
            const token = jwt.sign({ email: 'admin@test.com', role: 'admin' }, JWT_SECRET);
            logProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Admin update', deltaPercentage: 15 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body)).toEqual({
                message: 'Progress update logged successfully.',
                timestamp: '2026-03-01T00:00:00.000Z'
            });
            expect(logProgress).toHaveBeenCalledWith('proj_1', 'Admin update', 15);
        });
    });

    describe('getHistory', () => {
        test('returns 400 Bad Request if path parameter teamId is missing', async () => {
            const event = {};
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/teamId path parameter is required/);
        });

        test('returns 200 OK with logs list for owner user', async () => {
            const token = jwt.sign({ email: 'owner@test.com', role: 'user', _id: 'proj_1' }, JWT_SECRET);
            const mockLogs = [
                { PK: 'PROJ#proj_1', SK: 'LOG#2026-03-01', update_text: 'Update 1', delta_percentage: 10 }
            ];
            getProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual({
                teamId: 'proj_1',
                logs: mockLogs
            });
            expect(getProgressLogs).toHaveBeenCalledWith('proj_1');
        });
    });
});
