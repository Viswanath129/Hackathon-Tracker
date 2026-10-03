const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetProjectById = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../services/dynamoService', () => ({
    getProjectById: (...args) => mockGetProjectById(...args)
}));

const jwt = require('jsonwebtoken');
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

    describe('logUpdate', () => {
        test('should return 400 when body is missing', async () => {
            const res = await logUpdate({});
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Request body is missing');
        });

        test('should return 400 when body validation fails', async () => {
            const event = { body: JSON.stringify({ teamId: '', updateText: '', deltaPercentage: 10 }) };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
        });

        test('should return 401 when unauthenticated', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'p1', updateText: 'valid', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        test('should return 404 when project not found', async () => {
            const token = jwt.sign({ _id: 'user1' }, 'testsecret');
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'valid', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body).message).toBe('Project not found');
        });

        test('should return 403 when user is not project owner', async () => {
            const token = jwt.sign({ _id: 'user1' }, 'testsecret');
            mockGetProjectById.mockResolvedValue({ _id: 'p1', teamId: 'user2' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'valid', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
        });

        test('should return 201 Created on successful progress update', async () => {
            const token = jwt.sign({ _id: 'user1' }, 'testsecret');
            mockGetProjectById.mockResolvedValue({ _id: 'p1', teamId: 'user1' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00Z' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'p1', updateText: 'valid update', deltaPercentage: 15 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body).message).toBe('Progress update logged successfully');
        });
    });

    describe('getHistory', () => {
        test('should return 401 when token is missing', async () => {
            const event = { pathParameters: { teamId: 'p1' } };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(401);
        });

        test('should return 404 when project does not exist', async () => {
            const token = jwt.sign({ _id: 'user1' }, 'testsecret');
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'p1' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(404);
        });

        test('should return 200 with logs on success', async () => {
            const token = jwt.sign({ _id: 'user1' }, 'testsecret');
            mockGetProjectById.mockResolvedValue({ _id: 'p1', teamId: 'user1' });
            mockGetProgressLogs.mockResolvedValue([{ update_text: 'test', delta_percentage: 10 }]);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'p1' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body).data).toHaveLength(1);
        });
    });
});
