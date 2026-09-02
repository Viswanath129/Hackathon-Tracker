const jwt = require('jsonwebtoken');

// Mock services before requiring handlers
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockCheckProjectOwnership = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs,
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: mockCheckProjectOwnership,
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Lambda Handlers', () => {
    const origEnv = process.env;

    beforeEach(() => {
        process.env = { ...origEnv, JWT_SECRET: 'testsecretkey' };
        jest.clearAllMocks();
    });

    afterAll(() => {
        process.env = origEnv;
    });

    describe('logUpdate', () => {
        test('should return 400 if event body is missing', async () => {
            const event = { headers: {} };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Request body is missing');
        });

        test('should return 400 if JSON is invalid', async () => {
            const event = { body: '{invalid-json' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON payload');
        });

        test('should return 401 if Authorization header is missing', async () => {
            const event = { body: JSON.stringify({ teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 }) };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Not authorized, no token');
        });

        test('should return 401 if JWT is invalid', async () => {
            const event = {
                headers: { authorization: 'Bearer invalidtoken' },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Not authorized, token failed');
        });

        test('should return 400 if validation fails', async () => {
            const token = jwt.sign({ id: 'user_1', email: 'test@example.com' }, 'testsecretkey');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: '', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('updateText must be a non-empty string');
        });

        test('should return 403 if project ownership check fails (BOLA)', async () => {
            const token = jwt.sign({ id: 'user_1', email: 'test@example.com' }, 'testsecretkey');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_other', updateText: 'Log update', deltaPercentage: 10 })
            };
            mockCheckProjectOwnership.mockResolvedValue(false);

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toBe('Forbidden: Access denied for this project');
        });

        test('should log progress update successfully (201)', async () => {
            const token = jwt.sign({ id: 'user_1', email: 'test@example.com' }, 'testsecretkey');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Completed feature', deltaPercentage: 20 })
            };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(mockLogProgress).toHaveBeenCalledWith('proj_1', 'Completed feature', 20);
        });

        test('should return 500 on unexpected service error without exposing internal details', async () => {
            const token = jwt.sign({ id: 'user_1', email: 'test@example.com' }, 'testsecretkey');
            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Completed feature', deltaPercentage: 20 })
            };
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('DynamoDB connection lost'));

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        test('should return 400 if teamId path parameter is missing', async () => {
            const event = { pathParameters: {} };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('teamId parameter is required');
        });

        test('should return 200 with progress logs on success', async () => {
            const token = jwt.sign({ id: 'user_1', email: 'test@example.com' }, 'testsecretkey');
            const event = {
                pathParameters: { teamId: 'proj_1' },
                headers: { authorization: `Bearer ${token}` }
            };
            const mockLogs = [
                { PK: 'PROJ#proj_1', SK: 'LOG#1', update_text: 'Initial setup', delta_percentage: 10 }
            ];
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith('proj_1');
        });
    });
});
