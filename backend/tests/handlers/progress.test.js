const jwt = require('jsonwebtoken');

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

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Handlers - Progress', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('logUpdate', () => {
        it('should return 200 for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(200);
        });

        it('should return 400 if body is missing', async () => {
            const event = { httpMethod: 'POST', body: null };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Request body is required');
        });

        it('should return 400 if JSON parsing fails', async () => {
            const event = { httpMethod: 'POST', body: '{ invalid json ' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON payload');
        });

        it('should return 400 if validation fails', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: '', updateText: '', deltaPercentage: 50 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Validation failed');
        });

        it('should return 401 if user token is invalid/missing', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Log update', deltaPercentage: 10 }),
                headers: {}
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        it('should return 403 if project ownership check fails', async () => {
            const token = jwt.sign({ email: 'user@test.com' }, 'testsecret');
            mockCheckProjectOwnership.mockResolvedValue(false);

            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Log update', deltaPercentage: 10 }),
                headers: { Authorization: `Bearer ${token}` }
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(mockCheckProjectOwnership).toHaveBeenCalledWith('proj1', expect.objectContaining({ email: 'user@test.com' }));
        });

        it('should return 201 Created on success', async () => {
            const token = jwt.sign({ email: 'owner@test.com' }, 'testsecret');
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00.000Z' });

            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Great progress', deltaPercentage: 25 }),
                headers: { Authorization: `Bearer ${token}` }
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(body.data.timestamp).toBe('2026-03-01T00:00:00.000Z');
        });

        it('should return 500 on internal service error', async () => {
            const token = jwt.sign({ email: 'owner@test.com' }, 'testsecret');
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('DynamoDB write error'));

            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Great progress', deltaPercentage: 25 }),
                headers: { Authorization: `Bearer ${token}` }
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        it('should return 400 if teamId path parameter is missing', async () => {
            const event = { httpMethod: 'GET', pathParameters: null };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
        });

        it('should return 200 OK with logs on success', async () => {
            const token = jwt.sign({ email: 'owner@test.com' }, 'testsecret');
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockResolvedValue([
                { SK: 'LOG#1', update_text: 'Log 1', delta_percentage: 10 }
            ]);

            const event = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'proj1' },
                headers: { Authorization: `Bearer ${token}` }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.data).toHaveLength(1);
        });
    });
});
