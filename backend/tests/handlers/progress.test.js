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

describe('Lambda Handler: progress.js', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate', () => {
        it('returns 400 when event body is missing', async () => {
            const event = {};
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Request body is required');
        });

        it('returns 400 when body is invalid JSON string', async () => {
            const event = { body: '{ invalid json ' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON body');
        });

        it('returns 401 when auth token is missing', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Testing', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
        });

        it('returns 400 when validation fails (e.g. invalid deltaPercentage)', async () => {
            const token = jwt.sign({ email: 'team@test.com', role: 'team' }, 'testsecret');
            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Testing', deltaPercentage: true })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toContain('deltaPercentage must be a numeric value');
        });

        it('returns 403 when BOLA ownership check fails', async () => {
            const token = jwt.sign({ email: 'other@test.com', role: 'team' }, 'testsecret');
            mockCheckProjectOwnership.mockResolvedValue(false);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Testing', deltaPercentage: 15 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toContain('Forbidden');
        });

        it('returns 201 on successful progress update', async () => {
            const token = jwt.sign({ email: 'team@test.com', role: 'team' }, 'testsecret');
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T00:00:00Z' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Logged progress', deltaPercentage: 20 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(body.data.success).toBe(true);
            expect(mockLogProgress).toHaveBeenCalledWith('proj_1', 'Logged progress', 20);
        });

        it('returns 500 when service throws an exception', async () => {
            const token = jwt.sign({ email: 'team@test.com', role: 'team' }, 'testsecret');
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('DynamoDB connection failed'));

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Logged progress', deltaPercentage: 20 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        it('returns 400 when teamId parameter is missing', async () => {
            const event = { pathParameters: {} };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('teamId parameter is required');
        });

        it('returns 401 when user is not authenticated', async () => {
            const event = { pathParameters: { teamId: 'proj_1' } };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(401);
        });

        it('returns 403 when BOLA ownership check fails', async () => {
            const token = jwt.sign({ email: 'unauthorized@test.com', role: 'team' }, 'testsecret');
            mockCheckProjectOwnership.mockResolvedValue(false);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(403);
        });

        it('returns 200 with logs on success', async () => {
            const token = jwt.sign({ email: 'team@test.com', role: 'team' }, 'testsecret');
            const mockLogs = [
                { PK: 'PROJ#proj_1', SK: 'LOG#1', update_text: 'Update 1', delta_percentage: 10 }
            ];
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.history).toEqual(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith('proj_1');
        });

        it('returns 500 on service error', async () => {
            const token = jwt.sign({ email: 'team@test.com', role: 'team' }, 'testsecret');
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockRejectedValue(new Error('Query error'));

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });
});
