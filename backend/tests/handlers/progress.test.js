const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Progress Lambda Handlers', () => {
    const origEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...origEnv, JWT_SECRET: 'test_jwt_secret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterEach(() => {
        process.env = origEnv;
    });

    describe('logUpdate handler', () => {
        it('returns 200 for OPTIONS preflight request', async () => {
            const res = await logUpdate({ httpMethod: 'OPTIONS' });
            expect(res.statusCode).toBe(200);
            expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
        });

        it('returns 400 when event body is missing', async () => {
            const res = await logUpdate({});
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Missing request body');
        });

        it('returns 400 when body is invalid JSON string', async () => {
            const res = await logUpdate({ body: '{ invalid json' });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON format in request body');
        });

        it('returns 400 when validation fails (e.g., boolean deltaPercentage)', async () => {
            const res = await logUpdate({
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Done task 1',
                    deltaPercentage: true
                })
            });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toContain('deltaPercentage');
        });

        it('returns 400 when teamId is empty', async () => {
            const res = await logUpdate({
                body: JSON.stringify({
                    teamId: ' ',
                    updateText: 'Done task 1',
                    deltaPercentage: 20
                })
            });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toContain('teamId');
        });

        it('returns 401 when Authorization header is missing', async () => {
            const res = await logUpdate({
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Done task 1',
                    deltaPercentage: 20
                })
            });
            expect(res.statusCode).toBe(401);
        });

        it('returns 403 when user is not authorized for teamId (BOLA failure)', async () => {
            const token = jwt.sign({ email: 'other@example.com', teamId: 'team999' }, 'test_jwt_secret');
            const res = await logUpdate({
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Done task 1',
                    deltaPercentage: 20
                })
            });
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toContain('Forbidden');
        });

        it('returns 201 Created on successful progress update log', async () => {
            const token = jwt.sign({ email: 'user@example.com', teamId: 'team123' }, 'test_jwt_secret');
            mockLogProgress.mockResolvedValueOnce({ timestamp: '2026-03-01T10:00:00.000Z' });

            const res = await logUpdate({
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Completed backend integration',
                    deltaPercentage: 25
                })
            });

            expect(res.statusCode).toBe(201);
            expect(JSON.parse(res.body)).toEqual({
                message: 'Progress update logged successfully',
                timestamp: '2026-03-01T10:00:00.000Z'
            });
            expect(mockLogProgress).toHaveBeenCalledWith('team123', 'Completed backend integration', 25);
        });

        it('returns 500 Internal Server Error when service throws an exception', async () => {
            const token = jwt.sign({ email: 'user@example.com', teamId: 'team123' }, 'test_jwt_secret');
            mockLogProgress.mockRejectedValueOnce(new Error('DynamoDB Error'));

            const res = await logUpdate({
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teamId: 'team123',
                    updateText: 'Completed backend integration',
                    deltaPercentage: 25
                })
            });

            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory handler', () => {
        it('returns 400 if teamId path parameter is missing', async () => {
            const res = await getHistory({ pathParameters: {} });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('teamId parameter is required');
        });

        it('returns 401 if Authorization header is missing', async () => {
            const res = await getHistory({ pathParameters: { teamId: 'team123' } });
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Authorization header missing');
        });

        it('returns 200 and progress logs on success when authorized', async () => {
            const token = jwt.sign({ email: 'user@example.com', teamId: 'team123' }, 'test_jwt_secret');
            const mockLogs = [
                { PK: 'PROJ#team123', SK: 'LOG#2026-03-01', update_text: 'Initial log', delta_percentage: 10 }
            ];
            mockGetProgressLogs.mockResolvedValueOnce(mockLogs);

            const res = await getHistory({
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'team123' }
            });

            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith('team123');
        });

        it('returns 403 if auth header provided and user does not own project', async () => {
            const token = jwt.sign({ email: 'other@example.com', teamId: 'team999' }, 'test_jwt_secret');
            const res = await getHistory({
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'team123' }
            });

            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toContain('Forbidden');
        });

        it('returns 500 if getProgressLogs service throws an error', async () => {
            const token = jwt.sign({ email: 'user@example.com', teamId: 'team123' }, 'test_jwt_secret');
            mockGetProgressLogs.mockRejectedValueOnce(new Error('DynamoDB Query Failed'));

            const res = await getHistory({
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'team123' }
            });

            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });
});
