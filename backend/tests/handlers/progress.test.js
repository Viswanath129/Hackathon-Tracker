const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockCheckProjectOwnership = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: (...args) => mockCheckProjectOwnership(...args)
}));

const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Lambda Handlers', () => {
    const origEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...origEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = origEnv;
    });

    describe('logUpdate', () => {
        test('should return 400 when request body is missing', async () => {
            const res = await logUpdate({});
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Request body is required');
        });

        test('should return 400 on invalid JSON payload', async () => {
            const res = await logUpdate({ body: 'invalid-json{' });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON payload');
        });

        test('should return 400 when validation fails', async () => {
            const res = await logUpdate({
                body: JSON.stringify({ teamId: '', updateText: 'test', deltaPercentage: 10 })
            });
            expect(res.statusCode).toBe(400);
        });

        test('should return 401 when authorization token is missing', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Updated', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        test('should return 403 when BOLA ownership check fails', async () => {
            const token = jwt.sign({ email: 'user@test.com', role: 'team' }, 'testsecret');
            mockCheckProjectOwnership.mockResolvedValue(false);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_other', updateText: 'Updated', deltaPercentage: 10 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(mockCheckProjectOwnership).toHaveBeenCalled();
        });

        test('should return 201 on successful progress update log', async () => {
            const token = jwt.sign({ email: 'owner@test.com', _id: 'user_1' }, 'testsecret');
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T00:00:00Z' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Completed feature', deltaPercentage: 20 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body).data.success).toBe(true);
        });

        test('should return 500 when an unexpected error occurs', async () => {
            const token = jwt.sign({ email: 'owner@test.com', _id: 'user_1' }, 'testsecret');
            mockCheckProjectOwnership.mockRejectedValue(new Error('DB failure'));

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Completed feature', deltaPercentage: 20 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        test('should return 400 when teamId path parameter is missing', async () => {
            const res = await getHistory({ pathParameters: {} });
            expect(res.statusCode).toBe(400);
        });

        test('should return 401 when missing token', async () => {
            const res = await getHistory({ pathParameters: { teamId: 'proj_1' } });
            expect(res.statusCode).toBe(401);
        });

        test('should return 403 when BOLA check fails', async () => {
            const token = jwt.sign({ email: 'unauthorized@test.com' }, 'testsecret');
            mockCheckProjectOwnership.mockResolvedValue(false);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(403);
        });

        test('should return 200 with progress logs on success', async () => {
            const token = jwt.sign({ email: 'owner@test.com' }, 'testsecret');
            const logs = [{ PK: 'PROJ#proj_1', SK: 'LOG#1', update_text: 'Update 1' }];
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockResolvedValue(logs);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(logs);
        });
    });
});
