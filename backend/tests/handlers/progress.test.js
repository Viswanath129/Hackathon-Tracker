const jwt = require('jsonwebtoken');

// Define mocks starting with 'mock'
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

describe('Lambda Handlers - progress.js', () => {
    const origEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...origEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = origEnv;
    });

    describe('logUpdate handler', () => {
        it('should return 400 if event body is missing', async () => {
            const result = await logUpdate({});
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toContain('Missing request body');
        });

        it('should return 400 if event body is invalid JSON string', async () => {
            const result = await logUpdate({ body: '{ invalid json ' });
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toContain('Invalid JSON payload');
        });

        it('should return 401 if JWT token is missing or invalid', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 }),
                headers: {}
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(401);
        });

        it('should return 401 if JWT_SECRET is unconfigured', async () => {
            process.env.JWT_SECRET = '';
            const event = {
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 }),
                headers: { Authorization: 'Bearer some.token.here' }
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(401);
        });

        it('should return 400 if input validation fails (e.g. boolean deltaPercentage)', async () => {
            const token = jwt.sign({ _id: 'user1' }, 'testsecret');
            const event = {
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: true }),
                headers: { authorization: `Bearer ${token}` }
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(400);
        });

        it('should return 404 if project is not found or user is not owner', async () => {
            const token = jwt.sign({ _id: 'user1' }, 'testsecret');
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 }),
                headers: { authorization: `Bearer ${token}` }
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body).message).toBe('Project not found');
        });

        it('should return 201 Created on successful progress logging', async () => {
            const token = jwt.sign({ _id: 'user1' }, 'testsecret');
            mockGetProjectById.mockResolvedValue({ _id: 'p1', team_id: 'user1' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const event = {
                body: JSON.stringify({ teamId: 'p1', updateText: 'Sprint complete', deltaPercentage: 20 }),
                headers: { authorization: `Bearer ${token}` }
            };
            const result = await logUpdate(event);
            expect(result.statusCode).toBe(201);
            const data = JSON.parse(result.body);
            expect(data.message).toBe('Progress update logged successfully');
            expect(data.success).toBe(true);
        });
    });

    describe('getHistory handler', () => {
        it('should return 401 if unauthorized', async () => {
            const event = { pathParameters: { teamId: 'p1' }, headers: {} };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(401);
        });

        it('should return 404 if project not found', async () => {
            const token = jwt.sign({ _id: 'user1' }, 'testsecret');
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                pathParameters: { teamId: 'p1' },
                headers: { authorization: `Bearer ${token}` }
            };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(404);
        });

        it('should return 200 OK with history logs on success', async () => {
            const token = jwt.sign({ _id: 'user1' }, 'testsecret');
            const mockLogs = [{ update_text: 'Update 1', delta_percentage: 10 }];
            mockGetProjectById.mockResolvedValue({ _id: 'p1', team_id: 'user1' });
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                pathParameters: { teamId: 'p1' },
                headers: { authorization: `Bearer ${token}` }
            };
            const result = await getHistory(event);
            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual(mockLogs);
        });
    });
});
