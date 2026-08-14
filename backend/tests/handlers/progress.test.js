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

const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Handlers - Progress', () => {
    const origEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...origEnv, JWT_SECRET: 'test-secret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = origEnv;
    });

    describe('logUpdate handler', () => {
        test('should return 200 for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(200);
            expect(res.headers['Access-Control-Allow-Methods']).toContain('POST');
        });

        test('should return 400 when body is missing', async () => {
            const event = { httpMethod: 'POST' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/missing request body/i);
        });

        test('should return 400 when JSON body is invalid', async () => {
            const event = { httpMethod: 'POST', body: 'invalid-json' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/invalid json/i);
        });

        test('should return 400 when validation fails (e.g. boolean deltaPercentage)', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Update text',
                    deltaPercentage: true
                })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/boolean/i);
        });

        test('should return 401 when Authorization token is missing', async () => {
            const event = {
                httpMethod: 'POST',
                headers: {},
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Update text',
                    deltaPercentage: 20
                })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        test('should return 404 when project is not found (BOLA)', async () => {
            const token = jwt.sign({ id: 'user_1', email: 'user@example.com' }, 'test-secret');
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@example.com', role: 'team' });
            mockDynamoService.getProjectById.mockResolvedValue(null);

            const event = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Update text',
                    deltaPercentage: 20
                })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body).message).toMatch(/not found/i);
        });

        test('should return 403 when user is not authorized for project (BOLA)', async () => {
            const token = jwt.sign({ id: 'user_other', email: 'other@example.com' }, 'test-secret');
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_other', email: 'other@example.com', role: 'team' });
            mockDynamoService.getProjectById.mockResolvedValue({
                _id: 'proj_123',
                team_id: 'user_owner',
                type: 'PROJECT'
            });

            const event = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Update text',
                    deltaPercentage: 20
                })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toMatch(/Forbidden/i);
        });

        test('should return 201 on successful progress update by project owner', async () => {
            const token = jwt.sign({ id: 'user_owner', email: 'owner@example.com' }, 'test-secret');
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_owner', email: 'owner@example.com', role: 'team' });
            mockDynamoService.getProjectById.mockResolvedValue({
                _id: 'proj_123',
                team_id: 'user_owner',
                type: 'PROJECT'
            });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00Z' });

            const event = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Owner progress update',
                    deltaPercentage: 25
                })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(mockProgressService.logProgress).toHaveBeenCalledWith('proj_123', 'Owner progress update', 25);
        });

        test('should return 201 on successful progress update by admin', async () => {
            const token = jwt.sign({ id: 'admin_1', email: 'admin@example.com' }, 'test-secret');
            mockDynamoService.getUser.mockResolvedValue({ _id: 'admin_1', email: 'admin@example.com', role: 'admin' });
            mockDynamoService.getProjectById.mockResolvedValue({
                _id: 'proj_123',
                team_id: 'user_owner',
                type: 'PROJECT'
            });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00Z' });

            const event = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Admin progress update',
                    deltaPercentage: 30
                })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
        });

        test('should return 500 with generic error message if unexpected error occurs', async () => {
            const token = jwt.sign({ id: 'user_owner', email: 'owner@example.com' }, 'test-secret');
            mockDynamoService.getUser.mockRejectedValue(new Error('DynamoDB Error'));

            const event = {
                httpMethod: 'POST',
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'proj_123',
                    updateText: 'Owner progress update',
                    deltaPercentage: 25
                })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory handler', () => {
        test('should return 400 when teamId path parameter is missing', async () => {
            const event = { httpMethod: 'GET', pathParameters: null };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
        });

        test('should return 200 with logs on success', async () => {
            const token = jwt.sign({ id: 'user_owner', email: 'owner@example.com' }, 'test-secret');
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_owner', email: 'owner@example.com', role: 'team' });
            mockDynamoService.getProjectById.mockResolvedValue({
                _id: 'proj_123',
                team_id: 'user_owner',
                type: 'PROJECT'
            });

            const mockLogs = [
                { PK: 'PROJ#proj_123', SK: 'LOG#1', update_text: 'Log 1', delta_percentage: 10 }
            ];
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'proj_123' },
                headers: { authorization: `Bearer ${token}` }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });
    });
});
