const jwt = require('jsonwebtoken');

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

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Progress Handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
        jest.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('logUpdate', () => {
        test('should return 400 if event body is missing', async () => {
            const response = await logUpdate({});
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Request body is required');
        });

        test('should return 400 if JSON is invalid', async () => {
            const response = await logUpdate({ body: 'invalid json' });
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toContain('Invalid JSON');
        });

        test('should return 400 if validation fails', async () => {
            const response = await logUpdate({
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'test', deltaPercentage: true })
            });
            expect(response.statusCode).toBe(400);
        });

        test('should return 401 if JWT token is missing or secret is empty', async () => {
            process.env.JWT_SECRET = '';
            const response = await logUpdate({
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 }),
                headers: {}
            });
            expect(response.statusCode).toBe(401);
        });

        test('should return 404 if project is not found', async () => {
            const token = jwt.sign({ _id: 'proj_1', email: 'test@example.com' }, 'testsecret');
            mockGetProjectById.mockResolvedValue(null);

            const response = await logUpdate({
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 }),
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body).message).toBe('Project not found');
        });

        test('should return 403 if user does not own project (BOLA protection)', async () => {
            const token = jwt.sign({ _id: 'user_other', email: 'other@example.com' }, 'testsecret');
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', teamId: 'proj_1', ownerEmail: 'owner@example.com' });

            const response = await logUpdate({
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 }),
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(403);
        });

        test('should return 201 Created on successful progress update', async () => {
            const token = jwt.sign({ _id: 'proj_1', email: 'owner@example.com' }, 'testsecret');
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', teamId: 'proj_1', ownerEmail: 'owner@example.com' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const response = await logUpdate({
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Updated auth flow', deltaPercentage: 15 }),
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Progress updated successfully');
            expect(body.success).toBe(true);
        });

        test('should return 500 on internal service failure', async () => {
            const token = jwt.sign({ _id: 'proj_1', email: 'owner@example.com' }, 'testsecret');
            mockGetProjectById.mockRejectedValue(new Error('DynamoDB Error'));

            const response = await logUpdate({
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 }),
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        test('should return 400 if teamId is missing', async () => {
            const response = await getHistory({ pathParameters: {} });
            expect(response.statusCode).toBe(400);
        });

        test('should return 401 if token is missing', async () => {
            const response = await getHistory({ pathParameters: { teamId: 'proj_1' } });
            expect(response.statusCode).toBe(401);
        });

        test('should return 404 if project not found', async () => {
            const token = jwt.sign({ _id: 'proj_1', email: 'owner@example.com' }, 'testsecret');
            mockGetProjectById.mockResolvedValue(null);

            const response = await getHistory({
                pathParameters: { teamId: 'proj_1' },
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(404);
        });

        test('should return 200 OK with progress history', async () => {
            const token = jwt.sign({ _id: 'proj_1', email: 'owner@example.com' }, 'testsecret');
            mockGetProjectById.mockResolvedValue({ _id: 'proj_1', teamId: 'proj_1', ownerEmail: 'owner@example.com' });
            mockGetProgressLogs.mockResolvedValue([{ SK: 'LOG#2026-03-01', update_text: 'Done' }]);

            const response = await getHistory({
                pathParameters: { teamId: 'proj_1' },
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.logs.length).toBe(1);
        });
    });
});
