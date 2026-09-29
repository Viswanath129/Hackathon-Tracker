const jwt = require('jsonwebtoken');

const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Lambda Handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate handler', () => {
        test('returns 400 when body is missing', async () => {
            const event = {};
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Request body is required');
        });

        test('returns 400 when validation fails', async () => {
            const event = {
                body: JSON.stringify({ teamId: '', updateText: 'test', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
        });

        test('returns 401 when token is missing', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Updated auth', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        test('returns 404 when project is not found', async () => {
            const token = jwt.sign({ _id: 'user1', teamId: 'proj1', role: 'user' }, 'testsecret');
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Updated auth', deltaPercentage: 10 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body).message).toBe('Project not found');
        });

        test('returns 403 when user is not authorized for the project', async () => {
            const token = jwt.sign({ _id: 'user1', teamId: 'proj2', role: 'user' }, 'testsecret');
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'proj1' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Updated auth', deltaPercentage: 10 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
        });

        test('returns 201 on successful progress update', async () => {
            const token = jwt.sign({ _id: 'user1', teamId: 'proj1', role: 'user' }, 'testsecret');
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'proj1' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Updated auth', deltaPercentage: 10 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body).data.success).toBe(true);
        });
    });

    describe('getHistory handler', () => {
        test('returns 400 when teamId path parameter is missing', async () => {
            const event = { pathParameters: {} };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
        });

        test('returns 401 when token is missing', async () => {
            const event = { pathParameters: { teamId: 'proj1' } };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(401);
        });

        test('returns 200 with progress logs on success', async () => {
            const token = jwt.sign({ _id: 'user1', teamId: 'proj1', role: 'user' }, 'testsecret');
            mockGetProjectById.mockResolvedValue({ _id: 'proj1', teamId: 'proj1' });
            const mockLogs = [{ update_text: 'Done', delta_percentage: 20 }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body).data).toEqual(mockLogs);
        });
    });
});
