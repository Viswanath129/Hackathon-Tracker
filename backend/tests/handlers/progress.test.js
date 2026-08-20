const jwt = require('jsonwebtoken');

const mockDynamoService = {
    getUser: jest.fn(),
    getAllUsers: jest.fn(),
    getProjectById: jest.fn()
};

const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

jest.mock('../../services/dynamoService', () => mockDynamoService);
jest.mock('../../services/progressService', () => mockProgressService);

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda progress handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv, JWT_SECRET: 'test_jwt_secret', CORS_ORIGIN: 'http://localhost:5173' };
        jest.clearAllMocks();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate handler', () => {
        test('returns 400 when body is missing', async () => {
            const res = await logUpdate({ httpMethod: 'POST' });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Request body is required');
        });

        test('returns 400 when body is invalid JSON', async () => {
            const res = await logUpdate({ httpMethod: 'POST', body: 'invalid json {' });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON in request body');
        });

        test('returns 400 when validation fails', async () => {
            const res = await logUpdate({
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: true })
            });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toContain('boolean');
        });

        test('returns 401 when token is missing', async () => {
            const res = await logUpdate({
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 }),
                headers: {}
            });
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Unauthorized access');
        });

        test('returns 403 when user non-admin fails BOLA check', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test_jwt_secret');
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com', role: 'user' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 'other_user' });

            const res = await logUpdate({
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'p1', updateText: 'test', deltaPercentage: 10 }),
                headers: { authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toContain('Forbidden');
        });

        test('returns 201 Created on valid input and successful log', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test_jwt_secret');
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com', role: 'user' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 'user_1' });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const res = await logUpdate({
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'p1', updateText: 'Completed task', deltaPercentage: 10 }),
                headers: { authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.success).toBe(true);
            expect(body.timestamp).toBe('2026-02-28T00:00:00.000Z');
        });

        test('returns 500 when logProgress throws error', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test_jwt_secret');
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com', role: 'admin' });
            mockProgressService.logProgress.mockRejectedValue(new Error('DynamoDB write failed'));

            const res = await logUpdate({
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'p1', updateText: 'Completed task', deltaPercentage: 10 }),
                headers: { authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory handler', () => {
        test('returns 400 if teamId path parameter is missing', async () => {
            const res = await getHistory({ httpMethod: 'GET', pathParameters: {} });
            expect(res.statusCode).toBe(400);
        });

        test('returns 401 when token is missing', async () => {
            const res = await getHistory({
                httpMethod: 'GET',
                pathParameters: { teamId: 'p1' },
                headers: {}
            });
            expect(res.statusCode).toBe(401);
        });

        test('returns 200 OK with progress history logs when authenticated', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test_jwt_secret');
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com', role: 'user' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 'user_1' });
            const logs = [{ PK: 'PROJ#p1', SK: 'LOG#1', update_text: 'Update 1' }];
            mockProgressService.getProgressLogs.mockResolvedValue(logs);

            const res = await getHistory({
                httpMethod: 'GET',
                pathParameters: { teamId: 'p1' },
                headers: { authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(logs);
        });

        test('returns 500 when progressService throws an error', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test_jwt_secret');
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com', role: 'user' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'p1', team_id: 'user_1' });
            mockProgressService.getProgressLogs.mockRejectedValue(new Error('DynamoDB error'));

            const res = await getHistory({
                httpMethod: 'GET',
                pathParameters: { teamId: 'p1' },
                headers: { authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });
});
