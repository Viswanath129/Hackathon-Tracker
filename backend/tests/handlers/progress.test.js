const jwt = require('jsonwebtoken');

// Mock services before requiring handlers
const mockLogProgress = jest.fn();
const mockGetProgressLogs = jest.fn();
const mockGetUser = jest.fn();
const mockGetAllUsers = jest.fn();
const mockGetProjectById = jest.fn();
const mockGetHackathonsByUser = jest.fn();
const mockGetProjectsByHackathon = jest.fn();

jest.mock('../../services/progressService', () => ({
    logProgress: (...args) => mockLogProgress(...args),
    getProgressLogs: (...args) => mockGetProgressLogs(...args)
}));

jest.mock('../../services/dynamoService', () => ({
    getUser: (...args) => mockGetUser(...args),
    getAllUsers: (...args) => mockGetAllUsers(...args),
    getProjectById: (...args) => mockGetProjectById(...args),
    getHackathonsByUser: (...args) => mockGetHackathonsByUser(...args),
    getProjectsByHackathon: (...args) => mockGetProjectsByHackathon(...args)
}));

const { logUpdate, getHistory } = require('../../handlers/progress');

describe('Lambda Progress Handlers', () => {
    const originalJwtSecret = process.env.JWT_SECRET;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-secret';
        process.env.CORS_ORIGIN = 'http://localhost:5173';
    });

    afterAll(() => {
        process.env.JWT_SECRET = originalJwtSecret;
    });

    describe('logUpdate handler', () => {
        test('should return 200 for OPTIONS preflight request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(200);
            expect(response.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
        });

        test('should return 400 when body is missing', async () => {
            const event = { httpMethod: 'POST', body: null };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Missing request body');
        });

        test('should return 400 when body is invalid JSON', async () => {
            const event = { httpMethod: 'POST', body: '{ invalid json ' };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Invalid JSON payload');
        });

        test('should return 400 when input validation fails (e.g. boolean deltaPercentage)', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({
                    teamId: 'proj_101',
                    updateText: 'Update text',
                    deltaPercentage: true
                })
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('deltaPercentage cannot be a boolean');
        });

        test('should return 401 when authorization header is missing', async () => {
            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({
                    teamId: 'proj_101',
                    updateText: 'Update text',
                    deltaPercentage: 15
                }),
                headers: {}
            };
            const response = await logUpdate(event);
            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Not authorized, token missing');
        });

        test('should return 403 when BOLA authorization fails', async () => {
            const token = jwt.sign({ email: 'user@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ _id: 'user_1', email: 'user@example.com', role: 'user' });
            mockGetProjectById.mockResolvedValue(null);
            mockGetHackathonsByUser.mockResolvedValue([]);

            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({
                    teamId: 'proj_999',
                    updateText: 'Unauthorized update',
                    deltaPercentage: 20
                }),
                headers: { authorization: `Bearer ${token}` }
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(403);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Forbidden: Access to specified team resource denied');
        });

        test('should return 201 Created on successful progress logging', async () => {
            const token = jwt.sign({ email: 'owner@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ _id: 'user_owner', email: 'owner@example.com', role: 'user' });
            mockGetProjectById.mockResolvedValue({ _id: 'proj_101', team_id: 'user_owner' });
            mockLogProgress.mockResolvedValue({ success: true, timestamp: '2026-03-01T12:00:00.000Z' });

            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({
                    teamId: 'proj_101',
                    updateText: 'Successfully completed task',
                    deltaPercentage: 10
                }),
                headers: { Authorization: `Bearer ${token}` }
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Progress updated successfully');
            expect(body.timestamp).toBe('2026-03-01T12:00:00.000Z');
            expect(mockLogProgress).toHaveBeenCalledWith('proj_101', 'Successfully completed task', 10);
        });

        test('should mask internal error and return 500 Generic error message', async () => {
            const token = jwt.sign({ email: 'owner@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ _id: 'user_owner', email: 'owner@example.com', role: 'admin' });
            mockLogProgress.mockRejectedValue(new Error('Internal Database Crash Connection Failure'));

            const event = {
                httpMethod: 'POST',
                body: JSON.stringify({
                    teamId: 'proj_101',
                    updateText: 'Valid update',
                    deltaPercentage: 5
                }),
                headers: { authorization: `Bearer ${token}` }
            };

            const response = await logUpdate(event);
            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Internal Server Error');
            expect(body.message).not.toContain('Database Crash');
        });
    });

    describe('getHistory handler', () => {
        test('should return 400 if teamId path parameter is missing', async () => {
            const event = { httpMethod: 'GET', pathParameters: null };
            const response = await getHistory(event);
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('teamId parameter is required');
        });

        test('should return 200 OK with progress history logs', async () => {
            const token = jwt.sign({ email: 'admin@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ _id: 'admin_1', email: 'admin@example.com', role: 'admin' });
            const mockLogs = [
                { PK: 'PROJ#proj_101', SK: 'LOG#1', update_text: 'Log 1', delta_percentage: 10 }
            ];
            mockGetProgressLogs.mockResolvedValue(mockLogs);

            const event = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'proj_101' },
                headers: { authorization: `Bearer ${token}` }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toEqual(mockLogs);
            expect(mockGetProgressLogs).toHaveBeenCalledWith('proj_101');
        });

        test('should return 500 Internal Server Error when getProgressLogs fails', async () => {
            const token = jwt.sign({ email: 'admin@example.com' }, 'test-secret');
            mockGetUser.mockResolvedValue({ _id: 'admin_1', email: 'admin@example.com', role: 'admin' });
            mockGetProgressLogs.mockRejectedValue(new Error('DynamoDB timeout'));

            const event = {
                httpMethod: 'GET',
                pathParameters: { teamId: 'proj_101' },
                headers: { authorization: `Bearer ${token}` }
            };

            const response = await getHistory(event);
            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.message).toBe('Internal Server Error');
        });
    });
});
