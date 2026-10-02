const mockGetProjectById = jest.fn();
const mockGetUser = jest.fn();
const mockGetAllUsers = jest.fn();
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();

jest.mock('../../services/dynamoService', () => ({
    getProjectById: mockGetProjectById,
    getUser: mockGetUser,
    getAllUsers: mockGetAllUsers
}));

jest.mock('../../services/progressService', () => ({
    logProgress: mockLogProgress,
    getProgressLogs: mockGetProgressLogs
}));

const jwt = require('jsonwebtoken');
const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda progress handlers', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'test_jwt_secret', CORS_ORIGIN: 'http://localhost:5173' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logUpdate handler', () => {
        test('returns 400 when body is missing', async () => {
            const event = {};
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Missing request body');
        });

        test('returns 400 when body is invalid JSON', async () => {
            const event = { body: '{ invalid json' };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid JSON request body');
        });

        test('returns 401 when token is missing or invalid', async () => {
            const event = {
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'test', deltaPercentage: 10 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
            expect(JSON.parse(response.body).message).toBe('Unauthorized');
        });

        test('returns 401 when process.env.JWT_SECRET is unconfigured', async () => {
            delete process.env.JWT_SECRET;
            const token = jwt.sign({ email: 'team@test.com' }, 'secret');
            const event = {
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'test', deltaPercentage: 10 })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
        });

        test('returns 400 when validation fails', async () => {
            const token = jwt.sign({ email: 'team@test.com' }, 'test_jwt_secret');
            mockGetUser.mockResolvedValue({ _id: 'proj_123', email: 'team@test.com' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'test', deltaPercentage: true })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
        });

        test('returns 404 when project is not found', async () => {
            const token = jwt.sign({ email: 'team@test.com' }, 'test_jwt_secret');
            mockGetUser.mockResolvedValue({ _id: 'proj_123', email: 'team@test.com' });
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_nonexistent', updateText: 'test', deltaPercentage: 10 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body).message).toBe('Project not found');
        });

        test('returns 403 when user is unauthorized', async () => {
            const token = jwt.sign({ email: 'unauthorized@test.com' }, 'test_jwt_secret');
            mockGetUser.mockResolvedValue({ _id: 'other_user', email: 'unauthorized@test.com' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj_123', email: 'team@test.com' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'test', deltaPercentage: 10 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(403);
        });

        test('returns 201 Created on successful progress update log', async () => {
            const token = jwt.sign({ email: 'team@test.com' }, 'test_jwt_secret');
            mockGetUser.mockResolvedValue({ _id: 'proj_123', email: 'team@test.com' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj_123', email: 'team@test.com' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-02-28T10:00:00.000Z' });

            const event = {
                headers: { authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: 'proj_123', updateText: 'Logged feature', deltaPercentage: 15 })
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            expect(response.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
            expect(JSON.parse(response.body).message).toBe('Progress update logged successfully');
        });
    });

    describe('getHistory handler', () => {
        test('returns 401 when token is missing', async () => {
            const event = { pathParameters: { teamId: 'proj_123' } };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(401);
        });

        test('returns 404 when project is not found', async () => {
            const token = jwt.sign({ email: 'team@test.com' }, 'test_jwt_secret');
            mockGetUser.mockResolvedValue({ _id: 'proj_123', email: 'team@test.com' });
            mockGetProjectById.mockResolvedValue(null);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_nonexistent' }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(404);
            expect(JSON.parse(response.body).message).toBe('Project not found');
        });

        test('returns 403 when user is unauthorized', async () => {
            const token = jwt.sign({ email: 'other@test.com' }, 'test_jwt_secret');
            mockGetUser.mockResolvedValue({ _id: 'other_user', email: 'other@test.com' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj_123', email: 'team@test.com' });

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_123' }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(403);
        });

        test('returns 200 OK with progress history logs when authorized', async () => {
            const token = jwt.sign({ email: 'team@test.com' }, 'test_jwt_secret');
            mockGetUser.mockResolvedValue({ _id: 'proj_123', email: 'team@test.com' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj_123', email: 'team@test.com' });
            const mockLogs = [{ update_text: 'Done', delta_percentage: 20 }];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                headers: { Authorization: `Bearer ${token}` },
                pathParameters: { teamId: 'proj_123' }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual(mockLogs);
        });
    });
});
