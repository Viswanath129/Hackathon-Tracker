const jwt = require('jsonwebtoken');

const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockCheckProjectOwnership = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: mockCheckProjectOwnership
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Handlers - progress', () => {
    const SECRET = 'testsecret';

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = SECRET;
        process.env.CORS_ORIGIN = 'http://localhost:5173';
    });

    describe('logUpdate', () => {
        test('returns 400 if event or body is missing', async () => {
            const res1 = await logUpdate(null);
            expect(res1.statusCode).toBe(400);

            const res2 = await logUpdate({});
            expect(res2.statusCode).toBe(400);
        });

        test('returns 400 if JSON parsing fails', async () => {
            const res = await logUpdate({ body: '{invalid-json' });
            expect(res.statusCode).toBe(400);
        });

        test('returns 401 if Authorization header is missing or invalid', async () => {
            const res = await logUpdate({ body: JSON.stringify({ teamId: 'proj_1', updateText: 'a', deltaPercentage: 10 }) });
            expect(res.statusCode).toBe(401);
        });

        test('returns 401 if token signature is invalid', async () => {
            const res = await logUpdate({
                headers: { authorization: 'Bearer invalidtoken' },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'a', deltaPercentage: 10 })
            });
            expect(res.statusCode).toBe(401);
        });

        test('returns 400 if progress input validation fails', async () => {
            const token = jwt.sign({ _id: 'u1', email: 'u1@example.com' }, SECRET);
            const res = await logUpdate({
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: '', updateText: '', deltaPercentage: 10 })
            });
            expect(res.statusCode).toBe(400);
        });

        test('returns 403 if Broken Object Level Authorization (BOLA) check fails', async () => {
            const token = jwt.sign({ _id: 'u1', email: 'u1@example.com' }, SECRET);
            mockCheckProjectOwnership.mockResolvedValue(false);

            const res = await logUpdate({
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Valid log', deltaPercentage: 20 })
            });

            expect(res.statusCode).toBe(403);
            expect(mockCheckProjectOwnership).toHaveBeenCalledWith(expect.objectContaining({ _id: 'u1' }), 'proj_1');
        });

        test('returns 201 Created on successful progress update log', async () => {
            const token = jwt.sign({ _id: 'u1', email: 'u1@example.com' }, SECRET);
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ timestamp: '2026-03-01T00:00:00.000Z' });

            const res = await logUpdate({
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Valid log', deltaPercentage: 20 })
            });

            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(body.timestamp).toBe('2026-03-01T00:00:00.000Z');
        });

        test('returns 500 on internal service error', async () => {
            const token = jwt.sign({ _id: 'u1', email: 'u1@example.com' }, SECRET);
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('DynamoDB connection failed'));

            const res = await logUpdate({
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'Valid log', deltaPercentage: 20 })
            });

            expect(res.statusCode).toBe(500);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        test('returns 400 if teamId pathParameter is missing', async () => {
            const res = await getHistory({ pathParameters: {} });
            expect(res.statusCode).toBe(400);
        });

        test('returns 401 if unauthenticated', async () => {
            const res = await getHistory({ pathParameters: { teamId: 'proj_1' } });
            expect(res.statusCode).toBe(401);
        });

        test('returns 403 if BOLA check fails', async () => {
            const token = jwt.sign({ _id: 'u1', email: 'u1@example.com' }, SECRET);
            mockCheckProjectOwnership.mockResolvedValue(false);

            const res = await getHistory({
                pathParameters: { teamId: 'proj_1' },
                headers: { authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(403);
        });

        test('returns 200 OK with history items on success', async () => {
            const token = jwt.sign({ _id: 'u1', email: 'u1@example.com' }, SECRET);
            mockCheckProjectOwnership.mockResolvedValue(true);
            const mockLogs = [{ update_text: 'Log 1', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const res = await getHistory({
                pathParameters: { teamId: 'proj_1' },
                headers: { authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });
    });
});
