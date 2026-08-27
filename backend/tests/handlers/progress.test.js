const mockCheckProjectOwnership = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetUser = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getUser: mockGetUser,
    getAllUsers: jest.fn().mockResolvedValue([])
}));

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: mockCheckProjectOwnership
}));

const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Progress Handler (handlers/progress.js)', () => {
    const origJwtSecret = process.env.JWT_SECRET;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
    });

    afterAll(() => {
        process.env.JWT_SECRET = origJwtSecret;
    });

    describe('logUpdate handler', () => {
        it('returns 200 for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(200);
            expect(res.headers['Access-Control-Allow-Origin']).toBeDefined();
        });

        it('returns 400 when event.body is missing', async () => {
            const event = { httpMethod: 'POST' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Request body is required');
        });

        it('returns 400 when event.body is invalid JSON', async () => {
            const event = { httpMethod: 'POST', body: '{ invalid json ' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON payload');
        });

        it('returns 400 when validation fails', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: '', updateText: 'test', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('teamId must be a non-empty string');
        });

        it('returns 401 when unauthenticated', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({ teamId: 'proj1', updateText: 'test', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Not authorized');
        });

        it('returns 403 when user does not own project (BOLA check failure)', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com', role: 'user' });
            mockCheckProjectOwnership.mockResolvedValue(false);

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'test', deltaPercentage: 10 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toBe('Forbidden: Access denied for this project');
        });

        it('returns 201 Created on successful progress update logging', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'test-secret');
            const mockUser = { _id: 'user1', email: 'user@example.com', role: 'user' };
            mockGetUser.mockResolvedValue(mockUser);
            mockCheckProjectOwnership.mockResolvedValue(true);
            const fakeTimestamp = new Date().toISOString();
            mockLogProgress.mockResolvedValue({ success: true, timestamp: fakeTimestamp });

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Progress made', deltaPercentage: 15 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.success).toBe(true);
            expect(body.timestamp).toBe(fakeTimestamp);
            expect(mockLogProgress).toHaveBeenCalledWith('proj1', 'Progress made', 15);
        });

        it('returns 500 with generic message when service throws', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com', role: 'user' });
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('DynamoDB Error Detailed Internal Specs'));

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj1', updateText: 'Progress made', deltaPercentage: 15 })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory handler', () => {
        it('returns 400 if teamId path parameter is missing', async () => {
            const event = { httpMethod: 'GET', pathParameters: {} };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
        });

        it('returns 401 if request is unauthenticated', async () => {
            const event = { httpMethod: 'GET', pathParameters: { teamId: 'proj1' } };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(401);
        });

        it('returns 403 if user lacks access to the project', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com', role: 'user' });
            mockCheckProjectOwnership.mockResolvedValue(false);

            const event = {
                httpMethod: 'GET',
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(403);
        });

        it('returns 200 OK with progress history logs', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ _id: 'user1', email: 'user@example.com', role: 'user' });
            mockCheckProjectOwnership.mockResolvedValue(true);
            const mockLogs = [
                { PK: 'PROJ#proj1', SK: 'LOG#2026-02-28T10:00:00.000Z', update_text: 'Log 1', delta_percentage: 10 }
            ];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                httpMethod: 'GET',
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj1' }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });
    });
});
