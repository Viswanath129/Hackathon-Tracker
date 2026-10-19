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

describe('AWS Lambda Progress Handlers', () => {
    const origSecret = process.env.JWT_SECRET;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
        process.env.CORS_ORIGIN = 'http://localhost:5173';
    });

    afterAll(() => {
        process.env.JWT_SECRET = origSecret;
    });

    describe('logUpdate', () => {
        it('should return 200 for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(200);
        });

        it('should return 401 if JWT_SECRET is not configured', async () => {
            delete process.env.JWT_SECRET;
            const event = {
                headers: { authorization: 'Bearer token' },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Text', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toMatch(/authentication misconfigured/i);
        });

        it('should return 401 if authorization header is missing', async () => {
            const event = { headers: {} };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        it('should return 400 if body is missing', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test-secret');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: null
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
        });

        it('should return 400 if body is invalid JSON', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test-secret');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: '{ invalid json'
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
        });

        it('should return 400 if validation fails', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test-secret');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: '', deltaPercentage: 10 })
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
        });

        it('should return 404 if project is not found', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test-secret');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_nonexistent', updateText: 'Update', deltaPercentage: 10 })
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });
            mockDynamoService.getProjectById.mockResolvedValue(null);

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(404);
            expect(JSON.parse(res.body).message).toBe('Project not found');
        });

        it('should return 403 if project ownership check fails (BOLA)', async () => {
            const token = jwt.sign({ email: 'other@test.com' }, 'test-secret');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Update', deltaPercentage: 10 })
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_other', email: 'other@test.com' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'user_1' });

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toMatch(/Forbidden/i);
        });

        it('should return 201 on successful progress update', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test-secret');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Completed module', deltaPercentage: 20 })
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'user_1' });
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T12:00:00Z' });

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body).message).toBe('Progress update logged successfully');
            expect(mockProgressService.logProgress).toHaveBeenCalledWith('proj_1', 'Completed module', 20);
        });

        it('should return 500 when an internal error occurs', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test-secret');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Update', deltaPercentage: 10 })
            };
            mockDynamoService.getUser.mockRejectedValue(new Error('DynamoDB Error'));

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        it('should return 401 if token is missing', async () => {
            const event = { pathParameters: { teamId: 'proj_1' }, headers: {} };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(401);
        });

        it('should return 400 if teamId path parameter is missing', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test-secret');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                pathParameters: {}
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });

            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
        });

        it('should return 404 if project is not found', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test-secret');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_404' }
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });
            mockDynamoService.getProjectById.mockResolvedValue(null);

            const res = await getHistory(event);
            expect(res.statusCode).toBe(404);
        });

        it('should return 403 if user does not own project', async () => {
            const token = jwt.sign({ email: 'other@test.com' }, 'test-secret');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_1' }
            };
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_other', email: 'other@test.com' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'user_1' });

            const res = await getHistory(event);
            expect(res.statusCode).toBe(403);
        });

        it('should return 200 with progress history logs', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'test-secret');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_1' }
            };
            const mockLogs = [{ update_text: 'Log 1', delta_percentage: 10 }];
            mockDynamoService.getUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });
            mockDynamoService.getProjectById.mockResolvedValue({ _id: 'proj_1', team_id: 'user_1' });
            mockProgressService.getProgressLogs.mockResolvedValue(mockLogs);

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });
    });
});
