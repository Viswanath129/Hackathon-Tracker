const mockAuthService = {
    checkProjectOwnership: jest.fn()
};
const mockProgressService = {
    logProgress: jest.fn(),
    getProgressLogs: jest.fn()
};

jest.mock('../../utils/auth', () => mockAuthService);
jest.mock('../../services/progressService', () => mockProgressService);

const jwt = require('jsonwebtoken');
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
        test('should return 400 when body is missing', async () => {
            const result = await logUpdate({});
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe('Request body is required');
        });

        test('should return 400 when body is invalid JSON string', async () => {
            const result = await logUpdate({ body: '{invalid-json' });
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toBe('Invalid JSON format in request body');
        });

        test('should return 400 when validation fails', async () => {
            const result = await logUpdate({
                body: JSON.stringify({ teamId: '', updateText: 'Log', deltaPercentage: 10 })
            });
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).message).toContain('teamId is required');
        });

        test('should return 401 when token verification fails or no user found', async () => {
            const result = await logUpdate({
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Log', deltaPercentage: 10 }),
                headers: { authorization: 'Bearer invalidtoken' }
            });
            expect(result.statusCode).toBe(401);
        });

        test('should return 403 when Broken Object Level Authorization check fails', async () => {
            const token = jwt.sign({ _id: 'user_999', email: 'user@test.com' }, 'testsecret');
            mockAuthService.checkProjectOwnership.mockResolvedValue(false);

            const result = await logUpdate({
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Log', deltaPercentage: 10 }),
                headers: { authorization: `Bearer ${token}` }
            });

            expect(result.statusCode).toBe(403);
            expect(JSON.parse(result.body).message).toContain('Forbidden');
        });

        test('should return 201 when progress update is logged successfully', async () => {
            const token = jwt.sign({ _id: 'user_123', email: 'user@test.com' }, 'testsecret');
            mockAuthService.checkProjectOwnership.mockResolvedValue(true);
            mockProgressService.logProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00.000Z' });

            const result = await logUpdate({
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Updated UI', deltaPercentage: 20 }),
                headers: { authorization: `Bearer ${token}` }
            });

            expect(result.statusCode).toBe(201);
            expect(mockProgressService.logProgress).toHaveBeenCalledWith('proj_123', 'Updated UI', 20);
        });

        test('should return 500 sanitized error when service throws', async () => {
            const token = jwt.sign({ _id: 'user_123', email: 'user@test.com' }, 'testsecret');
            mockAuthService.checkProjectOwnership.mockResolvedValue(true);
            mockProgressService.logProgress.mockRejectedValue(new Error('DynamoDB Error details'));

            const result = await logUpdate({
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Updated UI', deltaPercentage: 20 }),
                headers: { authorization: `Bearer ${token}` }
            });

            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        test('should return 400 when teamId path parameter is missing', async () => {
            const result = await getHistory({});
            expect(result.statusCode).toBe(400);
        });

        test('should return 403 when authorization fails', async () => {
            const token = jwt.sign({ _id: 'user_123', email: 'user@test.com' }, 'testsecret');
            mockAuthService.checkProjectOwnership.mockResolvedValue(false);

            const result = await getHistory({
                pathParameters: { teamId: 'proj_123' },
                headers: { authorization: `Bearer ${token}` }
            });

            expect(result.statusCode).toBe(403);
        });

        test('should return 200 with progress logs on success', async () => {
            const token = jwt.sign({ _id: 'user_123', email: 'user@test.com' }, 'testsecret');
            mockAuthService.checkProjectOwnership.mockResolvedValue(true);
            const logs = [{ update_text: 'Initial log', delta_percentage: 10 }];
            mockProgressService.getProgressLogs.mockResolvedValue(logs);

            const result = await getHistory({
                pathParameters: { teamId: 'proj_123' },
                headers: { authorization: `Bearer ${token}` }
            });

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body)).toEqual(logs);
        });
    });
});
