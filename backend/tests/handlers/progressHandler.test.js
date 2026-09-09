const mockJwtVerify = jest.fn();
const mockGetUser = jest.fn();
const mockGetAllUsers = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockCheckProjectOwnership = jest.fn();

jest.mock('jsonwebtoken', () => ({
    verify: (...args) => mockJwtVerify(...args)
}));

jest.mock('../../services/dynamoService', () => ({
    getUser: (...args) => mockGetUser(...args),
    getAllUsers: (...args) => mockGetAllUsers(...args)
}));

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../utils/auth', () => ({
    checkProjectOwnership: (...args) => mockCheckProjectOwnership(...args)
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('progress Lambda handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'testsecret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate handler', () => {
        test('returns 400 if body is missing', async () => {
            const event = {};
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Request body is required' });
        });

        test('returns 400 if JSON is invalid', async () => {
            const event = { body: '{ invalid json' };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'Invalid JSON body' });
        });

        test('returns 401 if token is missing', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Update', deltaPercentage: 10 }),
                headers: {}
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({ message: 'Not authorized, no token' });
        });

        test('returns 401 if JWT_SECRET is unconfigured', async () => {
            delete process.env.JWT_SECRET;
            const event = {
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Update', deltaPercentage: 10 }),
                headers: { authorization: 'Bearer token123' }
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(401);
            expect(JSON.parse(res.body)).toEqual({ message: 'Unauthorized' });
        });

        test('returns 400 if validation fails', async () => {
            mockJwtVerify.mockReturnValue({ email: 'user@test.com' });
            mockGetUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });

            const event = {
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Update', deltaPercentage: true }),
                headers: { authorization: 'Bearer token123' }
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toContain('numeric value');
        });

        test('returns 403 if BOLA check fails', async () => {
            mockJwtVerify.mockReturnValue({ email: 'user@test.com' });
            mockGetUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });
            mockCheckProjectOwnership.mockResolvedValue(false);

            const event = {
                body: JSON.stringify({ teamId: 'proj_999', updateText: 'Update', deltaPercentage: 10 }),
                headers: { authorization: 'Bearer token123' }
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body)).toEqual({ message: 'Forbidden: Unauthorized access to project' });
        });

        test('returns 201 Created on success', async () => {
            mockJwtVerify.mockReturnValue({ email: 'user@test.com' });
            mockGetUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });
            mockCheckProjectOwnership.mockResolvedValue(true);
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T12:00:00Z' });

            const event = {
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Update', deltaPercentage: 10 }),
                headers: { authorization: 'Bearer token123' }
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(201);
            expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
            expect(JSON.parse(res.body)).toEqual({
                message: 'Progress update logged successfully',
                success: true,
                timestamp: '2026-03-01T12:00:00Z'
            });
        });

        test('returns 500 Internal Server Error on unhandled error', async () => {
            mockJwtVerify.mockReturnValue({ email: 'user@test.com' });
            mockGetUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });
            mockCheckProjectOwnership.mockRejectedValue(new Error('DynamoDB Error'));

            const event = {
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Update', deltaPercentage: 10 }),
                headers: { authorization: 'Bearer token123' }
            };
            const res = await logUpdate(event);
            expect(res.statusCode).toBe(500);
            expect(JSON.parse(res.body)).toEqual({ message: 'Internal Server Error' });
        });
    });

    describe('getHistory handler', () => {
        test('returns 400 if teamId path parameter is missing', async () => {
            const event = { pathParameters: {} };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body)).toEqual({ message: 'teamId parameter is required' });
        });

        test('returns 200 with logs on success', async () => {
            mockJwtVerify.mockReturnValue({ email: 'user@test.com' });
            mockGetUser.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });
            mockCheckProjectOwnership.mockResolvedValue(true);
            const mockLogs = [{ SK: 'LOG#2026-03-01', update_text: 'Log 1', delta_percentage: 10 }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                pathParameters: { teamId: 'proj_123' },
                headers: { authorization: 'Bearer token123' }
            };
            const res = await getHistory(event);
            expect(res.statusCode).toBe(200);
            expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
            expect(JSON.parse(res.body)).toEqual(mockLogs);
        });
    });
});
