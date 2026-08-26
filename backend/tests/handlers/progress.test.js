const jwt = require('jsonwebtoken');

const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetUser = jest.fn();
const mockGetAllUsers = jest.fn();
const mockCheckProjectOwnership = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

jest.mock('../../services/dynamoService', () => ({
    getUser: mockGetUser,
    getAllUsers: mockGetAllUsers
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: mockCheckProjectOwnership
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Progress Handlers', () => {
    const secret = 'test-secret';
    const originalEnvSecret = process.env.JWT_SECRET;
    const validToken = jwt.sign({ email: 'team@example.com' }, secret);

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = secret;
    });

    afterAll(() => {
        process.env.JWT_SECRET = originalEnvSecret;
    });

    describe('logUpdate', () => {
        test('returns 201 Created on successful progress logging', async () => {
            const mockUser = { _id: 'team_1', email: 'team@example.com', role: 'team' };
            mockGetUser.mockResolvedValue(mockUser);
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T10:00:00.000Z' });

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({
                    teamId: 'proj_1',
                    updateText: 'Finished sprint 1',
                    deltaPercentage: 20
                })
            };

            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Progress update logged successfully');
            expect(body.timestamp).toBe('2026-03-01T10:00:00.000Z');
            expect(mockLogProgress).toHaveBeenCalledWith('proj_1', 'Finished sprint 1', 20);
        });

        test('returns 400 Bad Request if body is missing', async () => {
            const event = { httpMethod: 'POST', headers: { Authorization: `Bearer ${validToken}` } };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Request body is missing');
        });

        test('returns 400 Bad Request if JSON parsing fails', async () => {
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${validToken}` },
                body: '{ invalid json }'
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('Invalid JSON payload');
        });

        test('returns 400 Bad Request if validation fails', async () => {
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: '', updateText: 'test', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toBe('teamId must be a non-empty string');
        });

        test('returns 401 Unauthorized if JWT_SECRET is unconfigured', async () => {
            delete process.env.JWT_SECRET;
            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body).message).toBe('Authentication secret unconfigured');
        });

        test('returns 401 Unauthorized if token is invalid or missing', async () => {
            const eventNoAuth = {
                httpMethod: 'POST',
                headers: {},
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 })
            };
            const resNoAuth = await logUpdate(eventNoAuth);
            expect(resNoAuth.statusCode).toBe(401);

            const eventBadToken = {
                httpMethod: 'POST',
                headers: { Authorization: 'Bearer bad.token.here' },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 })
            };
            const resBadToken = await logUpdate(eventBadToken);
            expect(resBadToken.statusCode).toBe(401);
        });

        test('returns 403 Forbidden on BOLA verification failure', async () => {
            const mockUser = { _id: 'team_1', email: 'team@example.com', role: 'team' };
            mockGetUser.mockResolvedValue(mockUser);
            mockCheckProjectOwnership.mockResolvedValue(false);

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj_unowned', updateText: 'test', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toBe('Forbidden: Access to this project is not authorized');
        });

        test('returns 500 Internal Server Error with generic message on unexpected error', async () => {
            const mockUser = { _id: 'team_1', email: 'team@example.com', role: 'team' };
            mockGetUser.mockResolvedValue(mockUser);
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockRejectedValue(new Error('DynamoDB Error'));

            const event = {
                httpMethod: 'POST',
                headers: { Authorization: `Bearer ${validToken}` },
                body: JSON.stringify({ teamId: 'proj_1', updateText: 'test', deltaPercentage: 10 })
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });

    describe('getHistory', () => {
        test('returns 200 OK on successful progress history fetch', async () => {
            const mockUser = { _id: 'team_1', email: 'team@example.com', role: 'team' };
            const mockLogs = [
                { PK: 'PROJ#proj_1', SK: 'LOG#1', update_text: 'Sprint 1', delta_percentage: 20 }
            ];
            mockGetUser.mockResolvedValue(mockUser);
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'proj_1' },
                headers: { Authorization: `Bearer ${validToken}` }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });

        test('returns 400 Bad Request if teamId path parameter is missing', async () => {
            const event = { httpMethod: 'GET', headers: { Authorization: `Bearer ${validToken}` } };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
        });

        test('returns 403 Forbidden on BOLA failure', async () => {
            const mockUser = { _id: 'team_1', email: 'team@example.com', role: 'team' };
            mockGetUser.mockResolvedValue(mockUser);
            mockCheckProjectOwnership.mockResolvedValue(false);

            const event = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'proj_unowned' },
                headers: { Authorization: `Bearer ${validToken}` }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(403);
        });

        test('returns 500 Internal Server Error on internal failure', async () => {
            const mockUser = { _id: 'team_1', email: 'team@example.com', role: 'team' };
            mockGetUser.mockResolvedValue(mockUser);
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockGetProgressLogs.mockRejectedValue(new Error('Database error'));

            const event = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'proj_1' },
                headers: { Authorization: `Bearer ${validToken}` }
            };

            const res = await getHistory(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body).message).toBe('Internal Server Error');
        });
    });
});
